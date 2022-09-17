import { Prisma } from "@prisma/client";

export const findModel = (model: string) => {
  const prismaModel = Prisma.dmmf.datamodel.models.find((prismaModel) => prismaModel.name === model);
  if (!prismaModel) throw new Error(`Cannot find prisma model for model "${model}"`);
  return prismaModel;
};

export const getUniqueField = (model: string) => {
  return findModel(model).fields.find((field) => field.isUnique)?.name;
};

export const getRelations = (model: string) => {
  return findModel(model).fields.filter((field) => field.kind === "object" && field.relationName);
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

export type PrismaFunction = typeof prismaFunctions[number];

export const isPrismaFn = (fn: string): fn is PrismaFunction => prismaFunctions.includes(fn as any);
