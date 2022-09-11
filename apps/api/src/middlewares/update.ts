import { transformCountFieldIntoSelectRelationsCount, transformFields } from ".prisma/type-graphql/helpers";
import { accessibleBy } from "@casl/prisma";
import { Prisma } from "@prisma/client";
import { ForbiddenError } from "apollo-server";
import graphqlFields from "graphql-fields";
import _ from "lodash";
import { NextFn, ResolverData } from "type-graphql";
import { Context } from "..";
import { createUserReadAbility } from "../utils/permissions";
import { getUniqueField } from "../utils/prisma";

export const createUpdateManyMiddleware = (model: Prisma.ModelName) => {
  const UpdateManyMiddleware = async (resolverData: ResolverData<Context>, next: NextFn) => {
    const { context, args } = resolverData;

    const userAbility = await createUserReadAbility(context);
    const userWhere = accessibleBy(userAbility, "update")[model];

    resolverData.args.where = args.where
      ? {
          AND: [args.where, userWhere],
        }
      : userWhere;

    return next();
  };
  Object.defineProperty(UpdateManyMiddleware, "name", { value: `UpdateMany${model}Middleware` });
  return UpdateManyMiddleware;
};

export const createUpdateOneMiddleware = (model: Prisma.ModelName) => {
  const UpdateOneMiddleware = async (resolverData: ResolverData<Context>, next: NextFn) => {
    const { context, args } = resolverData;

    const userAbility = await createUserReadAbility(context);
    const userWhere = accessibleBy(userAbility, "update")[model];

    const originalArgs = _.cloneDeep(args);
    resolverData.args.where = args.where
      ? {
          AND: [args.where, userWhere],
        }
      : userWhere;
    const { _count } = transformFields(graphqlFields(resolverData.info));

    const field = getUniqueField(model);
    return resolverData.context.prisma.$transaction(
      async (prisma) => {
        const beforeUpdateEntry = await prisma[model].findFirst({
          where: resolverData.args.where,
        });
        if (!beforeUpdateEntry) {
          throw new ForbiddenError(`Cannot update "${model}" with "${JSON.stringify(originalArgs.where)}"`);
        }
        const updatedEntry = await prisma[model].update({
          ...originalArgs,
          ...(_count && transformCountFieldIntoSelectRelationsCount(_count)),
        });
        const afterUpdateEntry = await prisma[model].findFirst({
          where: resolverData.args.where,
        });
        if (!afterUpdateEntry || beforeUpdateEntry[field] !== afterUpdateEntry[field]) {
          throw new ForbiddenError(`Cannot update "${model}" with "${JSON.stringify(originalArgs.where)}"`);
        }
        return updatedEntry;
      },
      {
        // Setting isolation to Serializable because of a race condition
        // https://github.com/prisma/prisma/issues/8612#issuecomment-1215739412
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      }
    );
  };
  Object.defineProperty(UpdateOneMiddleware, "name", { value: `UpdateOne${model}Middleware` });
  return UpdateOneMiddleware;
};
