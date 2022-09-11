# Getting started

## **API**

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

### **For getting started quickly run these together:**

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
