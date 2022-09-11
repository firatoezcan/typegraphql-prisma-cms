import { transformCountFieldIntoSelectRelationsCount, transformFields } from ".prisma/type-graphql/helpers";
import { accessibleBy } from "@casl/prisma";
import { Prisma } from "@prisma/client";
import graphqlFields from "graphql-fields";
import { NextFn, ResolverData } from "type-graphql";
import { Context } from "..";
import { createUserReadAbility } from "../utils/permissions";
import { getUniqueField } from "../utils/prisma";

export const createFindManyMiddleware = (model: Prisma.ModelName) => {
  const FindManyMiddleware = async (resolverData: ResolverData<Context>, next: NextFn) => {
    const { context, args } = resolverData;

    const userAbility = await createUserReadAbility(context);
    if (userAbility.can("read", model)) return next();

    const userWhere = accessibleBy(userAbility, "read")[model];

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

export const createFindOneMiddleware = (model: Prisma.ModelName) => {
  const FindOneMiddleware = async (resolverData: ResolverData<Context>, next: NextFn) => {
    const { context, args } = resolverData;
    const userAbility = await createUserReadAbility(context);
    if (userAbility.can("read", model)) return next();

    const userWhere = accessibleBy(userAbility, "read")[model];

    const actualResult = await next();
    resolverData.args.where = args.where
      ? {
          AND: [args.where, userWhere],
        }
      : userWhere;
    const { _count } = transformFields(graphqlFields(resolverData.info));
    const field = getUniqueField(model);

    const result = await resolverData.context.prisma[model].findFirst({
      ...resolverData.args,
      where: {
        AND: [resolverData.args.where, field ? { [field]: { equals: actualResult[field] } } : actualResult],
      },
      ...(_count && transformCountFieldIntoSelectRelationsCount(_count)),
    });

    return result;
  };
  Object.defineProperty(FindOneMiddleware, "name", { value: `FindOne${model}Middleware` });
  return FindOneMiddleware;
};
