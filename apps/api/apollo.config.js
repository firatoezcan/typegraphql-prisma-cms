module.exports = {
  client: {
    addTypename: true,
    includes: ["src/**/*.ts", "src/**/*.tsx"],
    name: "default",
    tagName: "gql",
    service: {
      localSchemaFile: "./schema.graphql",
      name: "default",
    },
  },
};
