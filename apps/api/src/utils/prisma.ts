import { Prisma } from "@prisma/client";

export const findModel = (model: string) => {
  const prismaModel = Prisma.dmmf.datamodel.models.find((prismaModel) => prismaModel.name === model);
  if (!prismaModel) throw new Error(`Cannot find prisma model for model "${model}"`);
  return prismaModel;
};

export const getUniqueField = (model: string) => {
  return findModel(model).fields.find((field) => field.isUnique)?.name;
};
