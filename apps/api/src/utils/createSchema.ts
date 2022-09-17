import { accessibleBy } from "@casl/prisma";
import { Prisma } from "@prisma/client";
import { DMMF } from "@prisma/client/runtime";
import graphqlFields from "graphql-fields";
import { lowerFirst } from "lodash";
import { extendType, inputObjectType, list, makeSchema, nonNull, nullable, objectType } from "nexus";
import * as Models from "nexus-prisma";
// eslint-disable-next-line import/no-unresolved
import NexusPrismaScalars from "nexus-prisma/scalars";
import { Context } from "..";
import { combineWhere, createPrismaArgs } from "./args";
import {
  createListRelationFilter,
  createRelationFilter,
  DateTimeFilter,
  IntFilter,
  ModelWhereMixin,
  NestedDateTimeFilter,
  NestedIntFilter,
  NestedStringFilter,
  StringFilter,
} from "./nexus-prisma-types";
import { createUserReadAbility } from "./permissions";
import { getRelations } from "./prisma";

export type DocumentableNode = DMMF.Model | DMMF.Field | DMMF.DatamodelEnum;

export const isModel = (node: DocumentableNode): node is DMMF.Model => {
  return "fields" in node;
};

export const isField = (node: DocumentableNode): node is DMMF.Field => {
  return "isList" in node;
};

export const isEnum = (node: DocumentableNode): node is DMMF.DatamodelEnum => {
  return "values" in node;
};

const prismaFunctions = [
  "findMany",
  "create",
  "delete",
  "update",
  "findUnique",
  "findFirst",
  "createMany",
  "deleteMany",
  "updateMany",
  "upsert",
  "aggregate",
  "groupBy",
] as const;

type PrismaFunction = typeof prismaFunctions[number];

const isPrismaFn = (fn: string): fn is PrismaFunction => prismaFunctions.includes(fn as any);

const batchPayloadType = objectType({
  name: "BatchPayload",
  definition(t) {
    t.field("count", {
      type: nonNull("Int"),
    });
  },
});

const getTypeForOperation = (prismaFn: PrismaFunction, name: string) => {
  if (prismaFn === "findMany") {
    return ["Query", list(name)] as const;
  }
  if (["create", "delete", "update"].includes(prismaFn)) {
    return ["Mutation", name] as const;
  }
  if (["findUnique", "findFirst"].includes(prismaFn)) {
    return ["Query", nullable(name)] as const;
  }
  if (["createMany", "deleteMany", "updateMany"].includes(prismaFn)) {
    return ["Mutation", batchPayloadType.name] as const;
  }
  return undefined;
};

export const createSchema = () => {
  const dmmf = Prisma.dmmf;
  const models = dmmf.datamodel.models;
  const relationFilters: string[] = [];
  const types = models.map((model) => {
    const relations = getRelations(model.name);
    const getRelation = (field: Prisma.DMMF.Field) => {
      if (field.kind === "object") {
        const relation = relations.find((relation) => relation.name === field.name);
        if (!relation) {
          return undefined;
        }
        return relation;
      }
    };
    const type = objectType({
      name: model.name,
      description: model.documentation,
      definition(t) {
        model.fields.forEach((field) => {
          const relation = getRelation(field);
          t.field({
            ...Models[model.name][field.name],
            args: relation ? { where: `${relation.type}WhereInput` } : undefined,
            resolve: undefined,
          });
        });
      },
    });

    const relationTypes = model.fields
      .map((field) => {
        if (field.kind === "object") {
          const relation = relations.find((relation) => relation.name === field.name);
          if (!relation) {
            return undefined;
          }
          if (field.isList) {
            const listRelationType = `${field.type}ListRelationFilter`;
            if (!relationFilters.includes(listRelationType)) {
              relationFilters.push(listRelationType);
              return createListRelationFilter(field.type);
            }
          }
          const singleRelationType = `${field.type}RelationFilter`;
          if (!relationFilters.includes(singleRelationType)) {
            relationFilters.push(singleRelationType);
            return createRelationFilter(field.type);
          }
        }
      })
      .filter(Boolean);

    const whereInput = inputObjectType({
      name: `${model.name}WhereInput`,
      definition(t) {
        ModelWhereMixin(t, model.name);

        model.fields.forEach((field) => {
          if (field.kind === "scalar") {
            if (field.type === "Decimal") {
              t.field({ name: field.name, type: `IntFilter` });
              return;
            }
            t.field({ name: field.name, type: `${field.type}Filter` });
            return;
          }
          if (field.kind === "object") {
            const relation = relations.find((relation) => relation.name === field.name);
            if (!relation) {
              t.field({ name: field.name, type: `Json` });
              return;
            }
            if (field.isList) {
              t.field({ name: field.name, type: `${field.type}ListRelationFilter` });
              return;
            }

            t.field({ name: field.name, type: `${field.type}RelationFilter` });
          }
        });
      },
    });

    console.log(whereInput.name);
    const operations = dmmf.mappings.modelOperations.find((m) => m.model === model.name);
    if (!operations) return type;
    const singleQueryType = extendType({
      type: "Query",
      definition(t) {
        t.field({
          name: lowerFirst(model.name),
          type: nullable(model.name),
          async resolve(source, args, ctx: Context, info) {
            const userAbility = await createUserReadAbility(ctx);
            const gqlFields = graphqlFields(info, {}, { processArguments: true });
            const prismaArgs = createPrismaArgs(userAbility, gqlFields, model.name);
            const userWhere = accessibleBy(userAbility, "read")[model.name];
            console.time("Querying");
            const res = await ctx.prisma[model.name].findFirst({
              ...prismaArgs,
              where: combineWhere(userWhere, args.where),
            });
            console.timeEnd("Querying");
            return res;
          },
        });
      },
    });
    const manyQueryType = extendType({
      type: "Query",
      definition(t) {
        t.field({
          name: lowerFirst(model.name) + "s",
          type: list(model.name),
          args: { where: `${model.name}WhereInput` },
          async resolve(source, args, ctx: Context, info) {
            const userAbility = await createUserReadAbility(ctx);
            const gqlFields = graphqlFields(info, {}, { processArguments: true });
            const prismaArgs = createPrismaArgs(userAbility, gqlFields, model.name);
            const userWhere = accessibleBy(userAbility, "read")[model.name];
            console.time("Querying");
            const res = await ctx.prisma[model.name].findMany({
              ...prismaArgs,
              where: combineWhere(userWhere, args.where),
            });
            console.timeEnd("Querying");
            return res;
          },
        });
      },
    });
    const rootOperations = Object.entries(operations).map(([prismaFn, resolverName]) => {
      if (!isPrismaFn(prismaFn)) return undefined;
      const type = getTypeForOperation(prismaFn, model.name);
      if (!type) return undefined;
      const [rootType, returnType] = type;
      return extendType({
        type: rootType,
        definition(t) {
          t.field({
            name: resolverName,
            type: returnType,
            resolve(source, args, ctx: Context, info) {
              debugger;
              return ctx.prisma[model.name][prismaFn]();
            },
          });
        },
      });
    });
    return [type, whereInput, ...relationTypes, singleQueryType, manyQueryType, ...rootOperations].filter(Boolean);
  });

  return makeSchema({
    types: [
      NexusPrismaScalars,
      batchPayloadType,
      NestedIntFilter,
      NestedStringFilter,
      IntFilter,
      StringFilter,
      NestedDateTimeFilter,
      DateTimeFilter,
      ...types.flat(1),
    ],
  });
};
