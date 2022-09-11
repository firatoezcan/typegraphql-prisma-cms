import { transformCountFieldIntoSelectRelationsCount, transformFields } from ".prisma/type-graphql/helpers";
import { accessibleBy } from "@casl/prisma";
import { Prisma } from "@prisma/client";
import graphqlFields from "graphql-fields";
import { NextFn, ResolverData } from "type-graphql";
import { Context } from "..";
import { createUserReadAbility } from "../utils/permissions";

export const createFindManyMiddleware = (model: Prisma.ModelName) => {
  const FindManyMiddleware = async (resolverData: ResolverData<Context>, next: NextFn) => {
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
  Object.defineProperty(FindManyMiddleware, "name", { value: `FindMany${model}Middleware` });
  return FindManyMiddleware;
};

export const createFindSingleMiddleware = (model: Prisma.ModelName) => {
  const FindSingleMiddleware = async (resolverData: ResolverData<Context>, next: NextFn) => {
    const { context, args } = resolverData;

    const userAbility = await createUserReadAbility(context);
    const userWhere = accessibleBy(userAbility)[model];

    /**
     * Todo: Maybe fix? Can this even be fixed?
     * We use a findFirst here instead of modifying the arguments for the findUnique
     *
     * This leads to a single query with a subqueries and inner joins instead of
     * multiple seperate (and probably better) queries but creating the include object
     * from the userAbility is not important right now. This works
     */
    const actualResult = await next();
    resolverData.args.where = args.where
      ? {
          AND: [args.where, userWhere],
        }
      : userWhere;
    const { _count } = transformFields(graphqlFields(resolverData.info));
    const result = await resolverData.context.prisma[model].findFirst({
      ...resolverData.args,
      ...(_count && transformCountFieldIntoSelectRelationsCount(_count)),
    });

    // Why is this even here?
    // Todo: Check unique columns here (could be something else than id)
    if (actualResult.id !== result.id) {
      return null;
    }

    return result;
  };
  Object.defineProperty(FindSingleMiddleware, "name", { value: `FindSingle${model}Middleware` });
  return FindSingleMiddleware;
};
