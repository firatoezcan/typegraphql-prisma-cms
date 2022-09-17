import { accessibleBy } from "@casl/prisma";
import { defaultsDeep } from "lodash";
import { AppAbility } from "./permissions";
import { getRelations } from "./prisma";

export const combineWhere = (userWhere: any, graphqlWhere: any) => {
  if (!userWhere || Object.keys(userWhere).length === 0) return graphqlWhere;
  return graphqlWhere
    ? {
        AND: [graphqlWhere, userWhere],
      }
    : userWhere;
};

export const createPrismaArgs = (ability: AppAbility, obj: Record<string, any>, fromModel: string) => {
  const relations = getRelations(fromModel);
  const sel = Object.entries(obj).map(([key, value]) => {
    if (key.startsWith("__arguments")) {
      return {};
    }
    if (Object.keys(value).length === 0) {
      return { [key]: true };
    }
    const field = relations.find((field) => field.name === key);
    if (!field) {
      // If this is a json f.e.
      return { [key]: true };
    }
    return { [key]: createPrismaArgs(ability, value, key) };
  });
  const userWhere = accessibleBy(ability, "read")[fromModel];

  const argsArray = obj.__arguments
    ?.map((arg) => {
      return Object.keys(arg).map((key) => ({ [key]: arg[key].value }));
    })
    .flat(1);
  const args = defaultsDeep(
    // @ts-expect-error
    ...(argsArray ?? [])
  );

  return {
    where: combineWhere(userWhere, args.where),
    select: defaultsDeep(
      // @ts-expect-error
      ...sel
    ),
  };
};
