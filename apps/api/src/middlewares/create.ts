import { transformCountFieldIntoSelectRelationsCount, transformFields } from ".prisma/type-graphql/helpers";
import { accessibleBy } from "@casl/prisma";
import { Prisma } from "@prisma/client";
import { ForbiddenError } from "apollo-server";
import graphqlFields from "graphql-fields";
import { NextFn, ResolverData } from "type-graphql";
import { Context } from "..";
import { createUserModifyAbility } from "../utils/permissions";
import { findModel, getUniqueField } from "../utils/prisma";

export const createCreateManyMiddleware = (model: Prisma.ModelName) => {
  const CreateManyMiddleware = async (resolverData: ResolverData<Context>, next: NextFn) => {
    const { context, args } = resolverData;
    const prismaModel = findModel(model);
    const relationFields = prismaModel.fields.filter((field) => field.kind === "object");

    const userAbility = await createUserModifyAbility(context);
    const userWhere = accessibleBy(userAbility, "create")[model];

    const { _count } = transformFields(graphqlFields(resolverData.info));

    return resolverData.context.prisma.$transaction(
      async (prisma) => {
        const relatedWhere = {};
        relationFields.map((relation) => {
          const fromField = relation?.relationFromFields?.[0] as string;
          const dataArr = Array.isArray(args.data) ? args.data : [args.data];
          const ids = dataArr.map((data) => data[fromField]);
          if (ids.length > 0) {
            relatedWhere[fromField] = { in: ids };
          }
        });
        const beforeCreateEntryCount = await prisma[model].count({
          where: {
            ...userWhere,
            ...relatedWhere,
          },
        });

        const createdEntries = await prisma[model].createMany({
          ...args,
          ...(_count && transformCountFieldIntoSelectRelationsCount(_count)),
        });

        const afterCreateEntryCount = await prisma[model].count({
          where: {
            ...userWhere,
            ...relatedWhere,
          },
        });
        if (beforeCreateEntryCount + createdEntries.count !== afterCreateEntryCount) {
          throw new ForbiddenError(`Cannot create "${model}" with given data`);
        }
        return createdEntries;
      },
      {
        // Setting isolation to Serializable because of a race condition
        // https://github.com/prisma/prisma/issues/8612#issuecomment-1215739412
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      }
    );
  };

  Object.defineProperty(CreateManyMiddleware, "name", { value: `CreateMany${model}Middleware` });
  return CreateManyMiddleware;
};

export const createCreateOneMiddleware = (model: Prisma.ModelName) => {
  const CreateOneMiddleware = async (resolverData: ResolverData<Context>, next: NextFn) => {
    const { context, args } = resolverData;
    const userAbility = await createUserModifyAbility(context);
    const userWhere = accessibleBy(userAbility, "create")[model];

    const { _count } = transformFields(graphqlFields(resolverData.info));

    const field = getUniqueField(model);
    return resolverData.context.prisma.$transaction(
      async (prisma) => {
        const createdEntry = await prisma[model].create({
          ...args,
          ...(_count && transformCountFieldIntoSelectRelationsCount(_count)),
        });
        const afterCreateEntry = await prisma[model].findFirst({
          where: {
            AND: [userWhere, field ? { [field]: { equals: createdEntry[field] } } : createdEntry],
          },
        });
        if (!afterCreateEntry) {
          throw new ForbiddenError(`Cannot create "${model}" with given data`);
        }
        return createdEntry;
      },
      {
        // Setting isolation to Serializable because of a race condition
        // https://github.com/prisma/prisma/issues/8612#issuecomment-1215739412
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      }
    );
  };
  Object.defineProperty(CreateOneMiddleware, "name", { value: `CreateOne${model}Middleware` });
  return CreateOneMiddleware;
};
