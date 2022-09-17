import { PrismaClient } from "@prisma/client";
import { ApolloServer } from "apollo-server";
import { GraphQLError } from "graphql";
import "reflect-metadata";
import { createSchema } from "./utils/createSchema";

export interface Context {
  prisma: PrismaClient;
  CustomerId?: number;
  EmployeeId?: number;
}

async function main() {
  const prisma = new PrismaClient({});

  await prisma.$connect();

  const schema = createSchema();
  const server = new ApolloServer({
    schema,
    context: ({ req }): Context => {
      const CustomerId = req.headers["CustomerId".toLowerCase()];
      const EmployeeId = req.headers["EmployeeId".toLowerCase()];
      const parsedCustomerId = Number.parseInt(CustomerId as any);
      const parsedEmployeeId = Number.parseInt(EmployeeId as any);
      return {
        prisma,
        CustomerId: isNaN(parsedCustomerId) ? undefined : parsedCustomerId,
        EmployeeId: isNaN(parsedEmployeeId) ? undefined : parsedEmployeeId,
      };
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
