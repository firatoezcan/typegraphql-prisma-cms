import { prisma, Prisma, PrismaClient } from "@prisma/client";
import { ApolloServer } from "apollo-server";
import path from "path";
import "reflect-metadata";
import { buildSchema, UseMiddleware } from "type-graphql";
import {
  applyResolversEnhanceMap,
  resolvers,
  ResolversEnhanceMap,
  ResolverActionsConfig,
  RelationResolversEnhanceMap,
  applyRelationResolversEnhanceMap,
} from ".prisma/type-graphql";
import { createFindManyMiddleware, createFindSingleMiddleware } from "./middlewares/find-many";
import { LogAccessMiddleware } from "./middlewares/log-access";

export interface Context {
  prisma: PrismaClient;
  userEmail?: string;
}

const createManyReadMiddlewares = <TModel extends Prisma.ModelName>(model: TModel) => {
  return {
    [`aggregate${model}`]: [UseMiddleware(createFindManyMiddleware(model))],
    [`deleteMany${model}`]: [UseMiddleware(createFindManyMiddleware(model))],
    [`findFirst${model}`]: [UseMiddleware(createFindManyMiddleware(model))],
    [`${model.toLowerCase()}s`]: [UseMiddleware(createFindManyMiddleware(model))],
    [`${model.toLowerCase()}`]: [UseMiddleware(createFindSingleMiddleware(model))],
    [`groupBy${model}`]: [UseMiddleware(createFindManyMiddleware(model))],
    [`updateMany${model}`]: [UseMiddleware(createFindManyMiddleware(model))],
  } as unknown as ResolverActionsConfig<TModel>;
};

const resolversEnhanceMap: ResolversEnhanceMap = {};
for (const model of Object.values(Prisma.ModelName)) {
  resolversEnhanceMap[model] = {
    _all: [UseMiddleware(LogAccessMiddleware)],
    ...createManyReadMiddlewares(model),
  };
}

const relationResolversEnhanceMap: RelationResolversEnhanceMap = {};
for (const model of Prisma.dmmf.datamodel.models) {
  for (const field of model.fields) {
    if (field.kind !== "object" || field.relationName === undefined) continue;
    if (!relationResolversEnhanceMap[model.name]) {
      relationResolversEnhanceMap[model.name] = {};
    }
    const findMiddleware = field.isList ? createFindManyMiddleware : createFindSingleMiddleware;
    relationResolversEnhanceMap[model.name][field.name] = [
      UseMiddleware(LogAccessMiddleware, findMiddleware(field.type as Prisma.ModelName)),
    ];
  }
}

applyResolversEnhanceMap(resolversEnhanceMap);
applyRelationResolversEnhanceMap(relationResolversEnhanceMap);

async function main() {
  const schema = await buildSchema({
    resolvers,
    emitSchemaFile: path.resolve(__dirname, "../schema.graphql"),
    validate: false,
  });

  const prisma = new PrismaClient({});

  await prisma.$connect();

  const server = new ApolloServer({
    schema,
    context: ({ req }): Context => {
      const userEmail = req.headers.authorization;
      return { prisma, userEmail };
    },
  });

  const { port } = await server.listen(4000);
  console.log(`GraphQL is listening on ${port}!`);
}

main().catch(console.error);
