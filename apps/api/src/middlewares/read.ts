import { transformCountFieldIntoSelectRelationsCount, transformFields } from ".prisma/type-graphql/helpers";
import { accessibleBy } from "@casl/prisma";
import { Prisma } from "@prisma/client";
import { Prisma as PrismaClient } from ".prisma/client";
import graphqlFields from "graphql-fields";
import { NextFn, ResolverData } from "type-graphql";
import { Context } from "..";
import { createUserReadAbility } from "../utils/permissions";
import { getUniqueField } from "../utils/prisma";

export const createFindManyMiddleware = (model: Prisma.ModelName) => {
  const FindManyMiddleware = async (resolverData: ResolverData<Context>, next: NextFn) => {
    const { context, args } = resolverData;

    const { _count } = transformFields(graphqlFields(resolverData.info));

    const userAbility = await createUserReadAbility(context);
    const gqlFields = graphqlFields(resolverData.info, {}, { processArguments: true });
    const transformedFields = transformFields(graphqlFields(resolverData.info));

    /**
     * Use transformedFields to create below resolver from this query
     *
     * query Employess {
     *   employees {
     *     EmployeeId
     *     Customer(where: {Country: {equals: "DE"}}) {
     *       CustomerId
     *       Invoice {
     *         InvoiceId
     *         Total
     *         InvoiceLine {
     *           Track {
     *             Name
     *             Album {
     *               Title
     *             }
     *             Composer
     *           }
     *           UnitPrice
     *           Quantity
     *         }
     *       }
     *     }
     *     ReportsTo
     *   }
     * }
     *
     */

    const resolveWithIncludes = () => {
      const getWhereArgs = (obj: any) => {
        // Todo: implement this to get the where part of the arguments
        return obj;
      };
      const getOtherArgs = (obj: any) => {
        // Todo: implement this to get arguments like skip, take, cursor, etc
        return obj;
      };
      resolverData.context.prisma.employee.findMany({
        include: {
          Customer: {
            ...(getOtherArgs(gqlFields.Customer) as PrismaClient.CustomerFindManyArgs),
            where: {
              AND: [getWhereArgs(gqlFields.Customer), accessibleBy(userAbility, "read").Customer],
            },
            include: {
              Invoice: {
                ...(getOtherArgs(gqlFields.Customer.Invoice) as PrismaClient.InvoiceFindManyArgs),
                where: {
                  AND: [getWhereArgs(gqlFields.Customer.Invoice), accessibleBy(userAbility, "read").Invoice],
                },
                include: {
                  InvoiceLine: {
                    ...(getOtherArgs(gqlFields.Customer.Invoice.InvoiceLine) as PrismaClient.InvoiceLineFindManyArgs),
                    where: {
                      AND: [
                        getWhereArgs(gqlFields.Customer.Invoice.InvoiceLine),
                        accessibleBy(userAbility, "read").InvoiceLine,
                      ],
                    },
                    include: {
                      Track: {
                        ...(getOtherArgs(
                          gqlFields.Customer.Invoice.InvoiceLine.Track
                        ) as PrismaClient.TrackFindManyArgs),
                        // Figure out why this is a type error? Are we too deep? Do we need to send a second query with the ids from the first one?
                        // where: {
                        //   AND: [
                        //     getWhereArgs(gqlFields.Customer.Invoice.InvoiceLine.Track),
                        //     accessibleBy(userAbility, "read").Track,
                        //   ],
                        // },
                        include: {
                          Album: {
                            select: {
                              Title: true,
                            },
                          },
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

    if (userAbility.can("read", model)) return next();

    const userWhere = accessibleBy(userAbility, "read")[model];

    resolverData.args.where = args.where
      ? {
          AND: [args.where, userWhere],
        }
      : userWhere;

    return next();
  };
  Object.defineProperty(FindManyMiddleware, "name", { value: `FindMany${model}Middleware` });
  return FindManyMiddleware;
};

export const createFindOneMiddleware = (model: Prisma.ModelName) => {
  const FindOneMiddleware = async (resolverData: ResolverData<Context>, next: NextFn) => {
    const { context, args } = resolverData;
    const userAbility = await createUserReadAbility(context);
    if (userAbility.can("read", model)) return next();

    const userWhere = accessibleBy(userAbility, "read")[model];

    const actualResult = await next();
    resolverData.args.where = args.where
      ? {
          AND: [args.where, userWhere],
        }
      : userWhere;
    const { _count } = transformFields(graphqlFields(resolverData.info));
    const field = getUniqueField(model);

    const result = await resolverData.context.prisma[model].findFirst({
      ...resolverData.args,
      where: {
        AND: [resolverData.args.where, field ? { [field]: { equals: actualResult[field] } } : actualResult],
      },
      ...(_count && transformCountFieldIntoSelectRelationsCount(_count)),
    });

    return result;
  };
  Object.defineProperty(FindOneMiddleware, "name", { value: `FindOne${model}Middleware` });
  return FindOneMiddleware;
};
