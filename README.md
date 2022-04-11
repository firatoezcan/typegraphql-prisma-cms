# Getting started

## **API**

Copy the `.env.example` in `apps/api` and rename it to `.env`

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

yarn api upd
yarn api prisma migrate reset
yarn api prisma generate
yarn api dev
```

Afterwards you can run the following mutation:

```graphql
mutation CreateUser {
  createUser(
    data: {
      firstName: "Firat"
      lastName: "Özcan"
      email: "firat.oezcan@gmail.com"
      label: "Fullstack Developer"
      image: "https://firatoezcan.com/_next/static/images/Firat-2-320-1d4a7719f0f09abdbdb3b173ba00dc81.jpg"
      phone: "redacted"
      summary: "Full Stack Architect. TypeScript, React, NextJS 🔥"
      location: {
        create: {
          address: "Heinrichstr. 9"
          postalCode: "38259"
          city: "Salzgitter"
          countryCode: "DE"
          region: "Niedersachsen"
        }
      }
      profiles: {
        createMany: {
          data: [
            { network: "Twitter", username: "firatoezcan", url: "https://twitter.com/firatoezcan" }
            { network: "GitHub", username: "firatoezcan", url: "https://github.com/firatoezcan" }
            { network: "LinkedIn", username: "firatoezcan", url: "https://www.linkedin.com/in/firatoezcan" }
          ]
        }
      }
      skills: {
        createMany: {
          data: [
            {
              category: "Frontend"
              level: "Expert"
              keywords: { set: ["HTML", "CSS", "React", "TypeScript", "GraphQL", "Relay", "Next.js"] }
            }
            { category: "Backend", level: "Expert", keywords: { set: ["Node.js", "TypeScript", "GraphQL", "SSR"] } }
          ]
        }
      }
    }
  ) {
    id
  }
}
```

and fetch the created data with the following query and the `authorization` header being set to `firat.oezcan@gmail.com` (or whatever email you used):

```graphql
query GetUser {
  user(where: { email: "firat.oezcan@gmail.com" }) {
    id
    firstName
    lastName
    email
    label
    image
    phone
    summary
    location {
      id
      address
      postalCode
      city
      countryCode
      region
    }
    profiles {
      id
      network
      username
      url
    }
    skills {
      id
      category
      level
      keywords
    }
  }
}
```
