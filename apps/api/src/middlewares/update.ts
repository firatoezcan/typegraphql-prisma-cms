import { transformCountFieldIntoSelectRelationsCount, transformFields } from ".prisma/type-graphql/helpers";
import { accessibleBy } from "@casl/prisma";
import { Prisma } from "@prisma/client";
import graphqlFields from "graphql-fields";
import { NextFn, ResolverData } from "type-graphql";
import { Context } from "..";
import { createUserReadAbility } from "../utils/permissions";

export const createUpdateManyMiddleware = (model: Prisma.ModelName) => {
  const UpdateManyMiddleware = async (resolverData: ResolverData<Context>, next: NextFn) => {
    const { context, args } = resolverData;

    const userAbility = await createUserReadAbility(context);
    const userWhere = accessibleBy(userAbility)[model];

    resolverData.args.where = args.where
      ? {
          AND: [args.where, userWhere],
        }
      : userWhere;
    debugger;

    return next();
  };
  Object.defineProperty(UpdateManyMiddleware, "name", { value: `UpdateMany${model}Middleware` });
  return UpdateManyMiddleware;
};

export const createUpdateSingleMiddleware = (model: Prisma.ModelName) => {
  const UpdateSingleMiddleware = async (resolverData: ResolverData<Context>, next: NextFn) => {
    const { context, args } = resolverData;

    const userAbility = await createUserReadAbility(context);
    const userWhere = accessibleBy(userAbility)[model];

    resolverData.args.where = args.where
      ? {
          AND: [args.where, userWhere],
        }
      : userWhere;
    const { _count } = transformFields(graphqlFields(resolverData.info));
    /**
     * Since update and updateMany have different signatures regarding relations some things dont work right now
     * f.e. cannot set userId for profile or use connect in updateProfile
     */
    const { count } = await resolverData.context.prisma[model].updateMany({
      ...resolverData.args,
      ...(_count && transformCountFieldIntoSelectRelationsCount(_count)),
    });

    if (count === 0) return null;

    const result = await resolverData.context.prisma[model].findFirst({
      where: args.where,
      ...(_count && transformCountFieldIntoSelectRelationsCount(_count)),
    });

    return result;
  };
  Object.defineProperty(UpdateSingleMiddleware, "name", { value: `UpdateSingle${model}Middleware` });
  return UpdateSingleMiddleware;
};
