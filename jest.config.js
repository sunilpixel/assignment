module.exports = {
  preset: "ts-jest",
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  transform: {
    "^.+\\.(ts|tsx)$": [
      "ts-jest",
      { tsconfig: "<rootDir>/tsconfig.json", isolatedModules: true },
    ],
  },
  transformIgnorePatterns: [
    "/node_modules/(?!(react-markdown|remark-gfm|remark-parse|remark-rehype|hast-util-to-jsx-runtime|unist-util-visit|unified|bail|ccount|mdast-util|micromark|property-information|space-separated-tokens|stringify-entities|trim-lines|vfile|web-namespaces)/)",
  ],
  testPathIgnorePatterns: ["/node_modules/", "/.next/"],
};
