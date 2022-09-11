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

    const userAbility = await createUserReadAbility(context);
    const userWhere = accessibleBy(userAbility)[model];

    resolverData.args.where = args.where
      ? {
          AND: [args.where, userWhere],
        }
      : userWhere;

    return next();
  };
  Object.defineProperty(DeleteManyMiddleware, "name", { value: `DeleteMany${model}Middleware` });
  return DeleteManyMiddleware;
};

export const createDeleteSingleMiddleware = (model: Prisma.ModelName) => {
  const DeleteSingleMiddleware = async (resolverData: ResolverData<Context>, next: NextFn) => {
    const { context, args } = resolverData;

    const userAbility = await createUserReadAbility(context);
    const userWhere = accessibleBy(userAbility)[model];

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
  Object.defineProperty(DeleteSingleMiddleware, "name", { value: `DeleteSingle${model}Middleware` });
  return DeleteSingleMiddleware;
};
