import "reflect-metadata";
import {
  applyRelationResolversEnhanceMap,
  applyResolversEnhanceMap,
  RelationResolversEnhanceMap,
  ResolverActionsConfig,
  resolvers,
  ResolversEnhanceMap,
  applyArgsTypesEnhanceMap,
  applyInputTypesEnhanceMap,
} from ".prisma/type-graphql";
import { Prisma, PrismaClient } from "@prisma/client";
import { ApolloServer } from "apollo-server";
import path from "path";
import { buildSchema, UseMiddleware } from "type-graphql";
import { createCreateManyMiddleware, createCreateOneMiddleware } from "./middlewares/create";
import { createFindManyMiddleware, createFindOneMiddleware } from "./middlewares/find";
import { LogTimeMiddleware } from "./middlewares/log-time";
import { createUpdateManyMiddleware, createUpdateOneMiddleware } from "./middlewares/update";
import { createDeleteOneMiddleware, createDeleteManyMiddleware } from "./middlewares/delete";
import { GraphQLError } from "graphql";

export interface Context {
  prisma: PrismaClient;
  userEmail?: string;
}

function lowerCaseFirstLetter(string: string) {
  return string.charAt(0).toLowerCase() + string.slice(1);
}

const createManyReadMiddlewares = <TModel extends Prisma.ModelName>(model: TModel) => {
  return {
    [`aggregate${model}`]: [UseMiddleware(createFindManyMiddleware(model))],
    [`deleteMany${model}`]: [UseMiddleware(createFindManyMiddleware(model))],
    [`findFirst${model}`]: [UseMiddleware(createFindManyMiddleware(model))],
    [`${lowerCaseFirstLetter(model)}s`]: [UseMiddleware(createFindManyMiddleware(model))],
    [`${lowerCaseFirstLetter(model)}`]: [UseMiddleware(createFindOneMiddleware(model))],
    [`groupBy${model}`]: [UseMiddleware(createFindManyMiddleware(model))],
    [`updateOne${model}`]: [UseMiddleware(createUpdateOneMiddleware(model))],
    [`updateMany${model}`]: [UseMiddleware(createUpdateManyMiddleware(model))],
    [`deleteOne${model}`]: [UseMiddleware(createDeleteOneMiddleware(model))],
    [`deleteMany${model}`]: [UseMiddleware(createDeleteManyMiddleware(model))],
  } as unknown as ResolverActionsConfig<TModel>;
};

const resolversEnhanceMap: ResolversEnhanceMap = {};
for (const model of Object.values(Prisma.ModelName)) {
  resolversEnhanceMap[model] = {
    _all: [UseMiddleware(LogTimeMiddleware)],
    ...createManyReadMiddlewares(model),
    [`createOne${model}`]: [UseMiddleware(createCreateOneMiddleware(model))],
    [`createMany${model}`]: [UseMiddleware(createCreateManyMiddleware(model))],
  };
}

const relationResolversEnhanceMap: RelationResolversEnhanceMap = {};
for (const model of Prisma.dmmf.datamodel.models) {
  for (const field of model.fields) {
    if (field.kind !== "object" || field.relationName === undefined) continue;
    if (!relationResolversEnhanceMap[model.name]) {
      relationResolversEnhanceMap[model.name] = {};
    }
    const findMiddleware = field.isList ? createFindManyMiddleware : createFindOneMiddleware;
    relationResolversEnhanceMap[model.name][field.name] = [
      UseMiddleware(LogTimeMiddleware, findMiddleware(field.type as Prisma.ModelName)),
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
    formatError: (err) => {
      // Remove the exception information when not in development
      if (process.env.NODE_ENV !== "development") {
        // Don't give the specific errors to the client.
        if (err instanceof GraphQLError) {
          err.extensions.exception = undefined;
          return err;
        }
      }
      return err;
    },
  });

  const { port } = await server.listen(4000);
  console.log(`GraphQL is listening on http://localhost:${port} !`);
}

main().catch(console.error);
