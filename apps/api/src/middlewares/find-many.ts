import { accessibleBy } from "@casl/prisma";
import { Prisma } from "@prisma/client";
import { NextFn, ResolverData } from "type-graphql";
import { Context } from "..";
import { createUserAbility } from "../utils/permissions";

export const createFindManyMiddleware = (model: Prisma.ModelName) => {
  const FindManyMiddleware = async (resolverData: ResolverData<Context>, next: NextFn) => {
    const { context, args } = resolverData;

    console.time(`Running findMany middleware for model "${model}" took: `);
    const userAbility = await createUserAbility(context);
    const userWhere = accessibleBy(userAbility)[model];

    resolverData.args.where = args.where
      ? {
          AND: [args.where, userWhere],
        }
      : userWhere;
    console.timeEnd(`Running findMany middleware for model "${model}" took: `);

    return next();
  };
  Object.defineProperty(FindManyMiddleware, "name", { value: `FindMany${model}Middleware` });
  return FindManyMiddleware;
};
