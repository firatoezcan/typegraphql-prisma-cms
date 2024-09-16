module.exports = {
  root: true,
  env: {
    es6: true,
    browser: true,
    node: true,
  },
  extends: ["plugin:import/recommended", "plugin:import/typescript", "react-app", "prettier"],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 7,
  },
  plugins: ["eslint-plugin-react-hooks", "eslint-plugin-jsx-a11y", "@typescript-eslint/eslint-plugin"],
  settings: {
    react: {
      version: "detect", // React version. "detect" automatically picks the version you have installed.
      // You can also use `16.0`, `16.3`, etc, if you want to override the detected value.
      // default to latest and warns if missing
      // It will default to "detect" in the future
    },
  },
  /**
   * Sorted alphanumerically within each group. built-in and each plugin form
   * their own groups.
   */
  rules: {
    curly: ["error", "multi-line", "consistent"],
    // Too interruptive
    "no-alert": "error",
    // Stylistic opinion
    "arrow-body-style": "off",
    // We are dropping all console.logs in production so we can ignore this rule
    "no-console": "off",
    "no-param-reassign": "error",

    "func-names": "error",
    "no-constant-condition": "error",
    // Use the proptype inheritance chain
    "no-prototype-builtins": "error",
    "no-underscore-dangle": "off",
    "nonblock-statement-body-position": "error",
    "prefer-arrow-callback": ["error", { allowNamedFunctions: true }],
    // Destructuring harm grep potential.
    "prefer-destructuring": "off",

    // disabled type-aware linting due to performance considerations
    "@typescript-eslint/dot-notation": "off",
    "dot-notation": "error",
    // disabled type-aware linting due to performance considerations
    "@typescript-eslint/no-implied-eval": "off",
    "no-implied-eval": "error",
    // disabled type-aware linting due to performance considerations
    "@typescript-eslint/no-throw-literal": "off",
    "no-throw-literal": "error",
    // disabled type-aware linting due to performance considerations
    "@typescript-eslint/return-await": "off",
    "@typescript-eslint/no-unused-vars": "warn",
    "no-return-await": "error",

    // Not sure why it doesn't work
    "import/export": "off",
    "import/named": "off",
    // Missing yarn workspace support
    "import/no-extraneous-dependencies": "off",
    "import/no-webpack-loader-syntax": "error",

    // doesn't work?
    "jsx-a11y/label-has-associated-control": [
      "error",
      {
        // airbnb uses 'both' which requires nesting i.e. <label><input /></label>
        // 'either' allows `htmlFor`
        assert: "either",
      },
    ],
    // We are a library, we need to support it too
    "jsx-a11y/no-autofocus": "off",
    "react-hooks/exhaustive-deps": ["error"],
    "react-hooks/rules-of-hooks": "error",

    // Can add verbosity to small functions making them harder to grok.
    // Though we have to manually enforce it for function components with default values.
    "react/destructuring-assignment": "off",
    "react/forbid-prop-types": "off", // Too strict, no time for that
    "react/jsx-curly-brace-presence": "off", // broken
    // Prefer <React.Fragment> over <>.
    "react/jsx-fragments": "off",
    // Enforces premature optimization
    "react/jsx-no-bind": "off",

    // Lol
    "react/jsx-props-no-spreading": "off",
    // This rule is great for raising people awareness of what a key is and how it works.
    "react/no-array-index-key": "off",
    "react/no-danger": "off",
    // Not always relevant
    "react/require-default-props": "off",
    // This depends entirely on what you're doing. There's no universal pattern
    "react/state-in-constructor": "off",
    // stylistic opinion. For conditional assignment we want it outside, otherwise as static
    "react/static-property-placement": "off",

    // Lol
    "import/extensions": "off",
    "react/no-unescaped-entities": "off",
  },
};
