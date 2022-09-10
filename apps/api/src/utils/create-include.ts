// This goes through the defined CASL condition for the given model and creates an array shape so we can know what

import _ from "lodash";
import { AppAbility } from "./permissions";

// we need to join later when checking for permissions
type Result = Array<Result | string>;
const getRelationsFromCondition = (condition?: PrismaQuery, parent?: string) => {
  if (!condition) return;
  const models: string[] = [];
  const allModels = Object.entries(condition).map(([key, value]) => {
    if (value === null || typeof value !== "object") return undefined;
    if (parent && ["is", "isNot", "every", "none", "some"].includes(key)) {
      models.push(parent);
    }
    if (Array.isArray(value)) {
      return value.map((v) => getRelationsFromCondition(v, key));
    }
    const res = getRelationsFromCondition(value, key);

    return res;
  });
  const containsArray = ["OR", "AND"].includes(parent as string);
  const result = [...models, ...allModels.flat(containsArray ? 2 : 1)].filter(Boolean);
  return result;
};

export const createInclude = (
  rules: ReturnType<AppAbility["possibleRulesFor"]>[number]["conditions"],
  relation: string
) => {
  const modelsInPermission = getRelationsFromCondition(rules) as Result;
  const startIndex = modelsInPermission.findIndex((entry) => entry === relation);
  if (startIndex === -1) return undefined;

  let shouldStop = false;
  let endIndex = startIndex;
  while (!shouldStop) {
    endIndex++;
    const next = modelsInPermission[endIndex];
    // If this happens we reached the next include tree for another model or the end
    if (typeof next === "string" || typeof next === "undefined") {
      shouldStop = true;
      continue;
    }
  }
  const permissionSlice = modelsInPermission.slice(startIndex + 1, endIndex);
  const slicesWithInclude = permissionSlice.map((slice) => {
    if (!Array.isArray(slice)) return undefined;
    const include = slice.reverse().reduce((acc, cur) => {
      if (typeof cur !== "string") {
        debugger;
        throw new Error("Open the debugger");
      }
      return {
        [cur]: Object.keys(acc).length > 0 ? { include: acc } : true,
      };
    }, {});
    return include;
  });

  const includeObj: Record<any, any> = {};
  slicesWithInclude.forEach((slice) => {
    _.defaultsDeep(includeObj, slice);
  });
  return includeObj;
};
