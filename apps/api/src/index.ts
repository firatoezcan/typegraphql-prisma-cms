import { Prisma, PrismaClient } from "@prisma/client";
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
} from ".prisma/type-graphql";
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

// Todo: Use this to generate below relationResolverEnhanceMap
console.log(Prisma.dmmf);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const relationResolversEnhanceMap: RelationResolversEnhanceMap = {
  User: {
    // This doesnt actually work because its a one-to-one relationship
    // location: [UseMiddleware(LogAccessMiddleware, createFindManyMiddleware("Location"))],
    profiles: [UseMiddleware(LogAccessMiddleware, createFindManyMiddleware("Profile"))],
    work: [UseMiddleware(LogAccessMiddleware, createFindManyMiddleware("Work"))],
    volunteer: [UseMiddleware(LogAccessMiddleware, createFindManyMiddleware("Volunteer"))],
    education: [UseMiddleware(LogAccessMiddleware, createFindManyMiddleware("Education"))],
    awards: [UseMiddleware(LogAccessMiddleware, createFindManyMiddleware("Award"))],
    publications: [UseMiddleware(LogAccessMiddleware, createFindManyMiddleware("Publication"))],
    skills: [UseMiddleware(LogAccessMiddleware, createFindManyMiddleware("Skill"))],
    languages: [UseMiddleware(LogAccessMiddleware, createFindManyMiddleware("Language"))],
    interests: [UseMiddleware(LogAccessMiddleware, createFindManyMiddleware("Interest"))],
    references: [UseMiddleware(LogAccessMiddleware, createFindManyMiddleware("Reference"))],
    projects: [UseMiddleware(LogAccessMiddleware, createFindManyMiddleware("Project"))],
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
