import { defineConfig } from "bunup";

export default defineConfig({
  entry: ["./src/index.ts"],
  dts: true,
  target: "node",  // Keep SDK universal for all users
  format: ["esm"],
  clean: true,
  sourcemap: true,
  external: [
    "@ai-sdk/anthropic",
    "@ai-sdk/openai",
    "ai",
    "zod",
    "glob",
    "js-yaml",
    "parse5",
    "remark",
    "remark-directive",
    "remark-frontmatter",
    "remark-mdx",
    "remark-parse",
    "remark-stringify",
    "xml2js",
    "commander",
    "ora"
  ],
});
