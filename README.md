> :warning: **Not production ready**: This is still work in progress and the sources may change drastically
> :warning: This is only public for inspiration

# About this project

This project is my attempt at building a GraphQL server where access-control is a first-class citizien.  
Usually I use Hasura for all my needs (and for anything production I would use it too), but since Hasura is not compatible with Sqlite and I want to use it I went out and tried building my own version that I can run without maintaining a Postgres/Mysql database.

This repository contains an `admin` and an `api` project. For now only `api` is relevant. `admin` is intended as a visual builder for the schema and permissions in the future.

`api` contains a GraphQL server with `Apollo Server` and `TypeGraphQL`. The schema and the resolvers are all generated from the `schema.prisma` file and enhanced with some additional middlewares for access control. Access control is handled by the amazing [`casl`](https://casl.js.org/v6/en/) library. Without this library I wouldn't even have tried this exact setup and albeit I struggled a lot at first due to the fact that I wanted to cover all edgecases with the flexible schema it now enables an amazing user experience.

Together you get a superb developer experience where most of your work is either defining the data model with [Prisma](https://www.prisma.io/) or defining permissions in the `permissions.ts`. Since Prisma generates a client and `casl` consumes those you get incredible type-safety and declarative policies that make iterating amazingly simple.

## Getting started

### **API**

| Command                       | Description                                                                                            |
| ----------------------------- | ------------------------------------------------------------------------------------------------------ |
| `yarn api upd`                | Starts PostgreSQL in Docker for API application                                                        |
| `yarn api down`               | Stops and removes dockerized PostgreSQL                                                                |
| `yarn api wipe`               | Stops the PostgreSQL and wipes the volumes                                                             |
| `yarn api prisma`             | Helper script with injected environment variables                                                      |
| `yarn api prisma migrate dev` | Creates a migration after you changed the `schema.prisma` file in `apps/api/prisma` and generates code |
| `yarn api prisma generate`    | Only generates Prisma code (helpful after deleting `node_modules`)                                     |
| `yarn api dev`                | Starts development server                                                                              |
| `yarn api build`              | Builds with `tsc`                                                                                      |
| `yarn api start`              | Starts production server                                                                               |
| `yarn api codelint`           | Runs `eslint`                                                                                          |
| `yarn api tslint`             | Runs `tsc` for type-checking                                                                           |
| `yarn api lint`               | Runs `codelint` and `tslint`                                                                           |

#### **For getting started quickly run these together:**

```bash
# If you ran this once before copy this line too so you start out fresh
yarn api wipe

cp apps/api/.env.example apps/api/.env
yarn api upd
yarn api prisma migrate reset
yarn api prisma generate
yarn api dev
```

## Todo Liste

- Tables without inputs break the api (this may break joint tables)
- Make a better default schema including sample data
