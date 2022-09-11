import { transformCountFieldIntoSelectRelationsCount, transformFields } from ".prisma/type-graphql/helpers";
import { accessibleBy } from "@casl/prisma";
import { Prisma } from "@prisma/client";
import { ForbiddenError } from "apollo-server";
import graphqlFields from "graphql-fields";
import _ from "lodash";
import { NextFn, ResolverData } from "type-graphql";
import { Context } from "..";
import { createUserReadAbility } from "../utils/permissions";

export const createDeleteManyMiddleware = (model: Prisma.ModelName) => {
  const DeleteManyMiddleware = async (resolverData: ResolverData<Context>, next: NextFn) => {
    const { context, args } = resolverData;
    const findModel = (model: string) => Prisma.dmmf.datamodel.models.find((prismaModel) => prismaModel.name === model);
    const prismaModel = findModel(model);
    if (!prismaModel) throw new Error(`Cannot find prisma model for model "${model}"`);
    const relationFields = prismaModel.fields.filter((field) => field.kind === "object");

    const userAbility = await createUserReadAbility(context);
    const userWhere = accessibleBy(userAbility, "delete")[model];

    const { _count } = transformFields(graphqlFields(resolverData.info));

    return resolverData.context.prisma.$transaction(
      async (prisma) => {
        const relatedWhere = {};
        relationFields.map((relation) => {
          const fromField = relation?.relationFromFields?.[0] as string;
          const condition = args.where[fromField];
          if (condition) {
            relatedWhere[fromField] = condition;
          }
        });
        const beforeCreateEntryCount = await prisma[model].count({
          where: {
            ...userWhere,
            ...relatedWhere,
          },
        });

        const createdEntries = await prisma[model].deleteMany({
          ...args,
          ...(_count && transformCountFieldIntoSelectRelationsCount(_count)),
        });

        const afterCreateEntryCount = await prisma[model].count({
          where: {
            ...userWhere,
            ...relatedWhere,
          },
        });
        if (beforeCreateEntryCount - createdEntries.count !== afterCreateEntryCount) {
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
  Object.defineProperty(DeleteManyMiddleware, "name", { value: `DeleteMany${model}Middleware` });
  return DeleteManyMiddleware;
};

export const createDeleteOneMiddleware = (model: Prisma.ModelName) => {
  const DeleteOneMiddleware = async (resolverData: ResolverData<Context>, next: NextFn) => {
    const { context, args } = resolverData;

    const userAbility = await createUserReadAbility(context);
    const userWhere = accessibleBy(userAbility, "delete")[model];

    const originalArgs = _.cloneDeep(args);
    resolverData.args.where = args.where
      ? {
          AND: [args.where, userWhere],
        }
      : userWhere;
    const { _count } = transformFields(graphqlFields(resolverData.info));

    return resolverData.context.prisma.$transaction(
      async (prisma) => {
        const beforeDeleteEntry = await prisma[model].findFirst({
          where: resolverData.args.where,
        });
        if (!beforeDeleteEntry) {
          throw new ForbiddenError(`Cannot delete "${model}" with "${JSON.stringify(originalArgs.where)}"`);
        }
        const deletedEntry = await prisma[model].delete({
          ...originalArgs,
          ...(_count && transformCountFieldIntoSelectRelationsCount(_count)),
        });
        return deletedEntry;
      },
      {
        // Setting isolation to Serializable because of a race condition
        // https://github.com/prisma/prisma/issues/8612#issuecomment-1215739412
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      }
    );
  };
  Object.defineProperty(DeleteOneMiddleware, "name", { value: `DeleteOne${model}Middleware` });
  return DeleteOneMiddleware;
};
