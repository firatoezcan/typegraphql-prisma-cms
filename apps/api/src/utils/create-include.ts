// This goes through the defined CASL condition for the given model and creates an array shape so we can know what

import { PrismaQuery } from "@casl/prisma";
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
  const result = [...models, ...allModels].filter(Boolean);
  return result;
};

export const createSingleInclude = (
  rules: ReturnType<AppAbility["possibleRulesFor"]>[number]["conditions"],
  relation: string
) => {
  const modelsInPermission = getRelationsFromCondition(rules) as Result;
  const startIndex = modelsInPermission.findIndex((entry) => entry[0] === relation);
  if (startIndex === -1) return undefined;

  const tree = modelsInPermission[startIndex];
  const collapseArraysTraverse = (leaf: string | Result, parent?: any) => {
    if (Array.isArray(leaf)) {
      const res = leaf.map((l) => collapseArraysTraverse(l, typeof leaf[0] === "string" ? leaf[0] : parent));
      return res;
    }
    if (typeof leaf === "string") {
      return leaf;
    }
  };
  const simpleTree = collapseArraysTraverse(tree[1]);
  const includeTraverse = (leaf: Array<any>, parent?: string) => {
    if (leaf.length === 0) {
      if (parent) {
        const key = parent.split(".").join(".include.");
        const value = _.get(include, key);
        if (!value) {
          _.set(include, key, true);
        }
      }
      return;
    }
    if (leaf.length === 2) {
      const newParent = leaf[0];
      const dotParent = !parent ? newParent : `${parent}.${newParent}`;
      if (typeof newParent === "string") {
        const next = leaf[1];
        includeTraverse(next, dotParent);
        return;
      }
    }
    if (Array.isArray(leaf)) {
      leaf.map((l) => includeTraverse(l, parent));
    }
  };
  const include: Record<string, any> = {};
  includeTraverse(simpleTree);
  return Object.keys(include).length > 0 ? include : undefined;
};

export const createInclude = (rules: ReturnType<AppAbility["possibleRulesFor"]>, relation: string) => {
  return _.defaultsDeep({}, ...rules.map((rule) => createSingleInclude(rule.conditions, relation)).filter(Boolean));
};
