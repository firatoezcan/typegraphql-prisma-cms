import { accessibleBy } from "@casl/prisma";
import { prisma, Prisma } from "@prisma/client";
import { DMMF } from "@prisma/client/runtime";
import { extendType, list, makeSchema, mutationType, nullable, objectType, queryType } from "nexus";
// eslint-disable-next-line import/no-unresolved
import * as Models from "nexus-prisma";
// eslint-disable-next-line import/no-unresolved
import NexusPrismaScalars from "nexus-prisma/scalars";
import { Context } from "..";
import { createUserReadAbility } from "./permissions";

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

export const runQuery = async (ctx: Context) => {
  const userAbility = await createUserReadAbility(ctx);

  return ctx.prisma.Employee.findMany({
    where: accessibleBy(userAbility, "read").Employee,
    include: {
      Customer: {
        where: accessibleBy(userAbility, "read").Customer,
        include: {
          Invoice: {
            where: accessibleBy(userAbility, "read").Invoice,
            include: {
              InvoiceLine: {
                where: accessibleBy(userAbility, "read").InvoiceLine,
                include: {
                  Track: {
                    include: {
                      Album: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });
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
      type: "Int",
    });
  },
});

function lowerCaseFirstLetter(string: string) {
  return string.charAt(0).toLowerCase() + string.slice(1);
}

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
  const types = models.map((model) => {
    const type = objectType({
      name: model.name,
      description: model.documentation,
      definition(t) {
        model.fields.forEach((field) => {
          t.field(Models[model.name][field.name]);
        });
      },
    });
    const operations = dmmf.mappings.modelOperations.find((m) => m.model === model.name);
    if (!operations) return type;
    const singleQueryType = extendType({
      type: "Query",
      definition(t) {
        t.field({
          name: lowerCaseFirstLetter(model.name),
          type: nullable(model.name),
          resolve(_, __, ctx) {
            debugger;
            return ctx.prisma[model.name].findUnique();
          },
        });
      },
    });
    const manyQueryType = extendType({
      type: "Query",
      definition(t) {
        t.field({
          name: lowerCaseFirstLetter(model.name) + "s",
          type: list(model.name),
          resolve(_, __, ctx) {
            if (model.name === "Employee") {
              return runQuery(ctx);
            }
            debugger;
            return ctx.prisma[model.name].findMany();
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
            resolve(_, __, ctx) {
              debugger;
              return ctx.prisma[model.name][prismaFn]();
            },
          });
        },
      });
    });
    return [type, singleQueryType, manyQueryType, ...rootOperations].filter(Boolean);
  });

  return makeSchema({
    types: [NexusPrismaScalars, batchPayloadType, ...types.flat(1)],
  });
};
