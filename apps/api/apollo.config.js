const path = require("path");

module.exports = {
  client: {
    addTypename: true,
    includes: ["src/**/*.ts", "src/**/*.tsx"],
    name: "default",
    tagName: "gql",
    service: {
      localSchemaFile: path.resolve(__dirname, "schema.graphql"),
      name: "default",
    },
  },
};
