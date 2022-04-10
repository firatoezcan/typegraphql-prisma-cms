import { PrismaClient } from "@prisma/client";
import { ApolloServer } from "apollo-server";
import path from "path";
import "reflect-metadata";
import { buildSchema, UseMiddleware } from "type-graphql";
import { applyResolversEnhanceMap, resolvers, ResolversEnhanceMap } from ".prisma/type-graphql";
import { createFindManyMiddleware } from "./middlewares/find-many";
import { LogAccessMiddleware } from "./middlewares/log-access";

export interface Context {
  prisma: PrismaClient;
  userEmail?: string;
}

const resolversEnhanceMap: ResolversEnhanceMap = {
  User: {
    _all: [UseMiddleware(LogAccessMiddleware)],
    aggregateUser: [UseMiddleware(createFindManyMiddleware("User"))],
    deleteManyUser: [UseMiddleware(createFindManyMiddleware("User"))],
    findFirstUser: [UseMiddleware(createFindManyMiddleware("User"))],
    users: [UseMiddleware(createFindManyMiddleware("User"))],
    groupByUser: [UseMiddleware(createFindManyMiddleware("User"))],
    updateManyUser: [UseMiddleware(createFindManyMiddleware("User"))],
  },
  Location: {
    createLocation: [UseMiddleware(LogAccessMiddleware)],
  },
};

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
