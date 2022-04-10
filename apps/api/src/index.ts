import { Prisma, PrismaClient } from "@prisma/client";
import { ApolloServer } from "apollo-server";
import path from "path";
import "reflect-metadata";
import { buildSchema, UseMiddleware } from "type-graphql";
import { applyResolversEnhanceMap, resolvers, ResolversEnhanceMap, ResolverActionsConfig } from ".prisma/type-graphql";
import { createFindManyMiddleware } from "./middlewares/find-many";
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

applyResolversEnhanceMap(resolversEnhanceMap);

async function main() {
  const schema = await buildSchema({
    resolvers,
    emitSchemaFile: path.resolve(__dirname, "../schema.graphql"),
    validate: false,
  });

  const prisma = new PrismaClient();
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
