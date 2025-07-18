#!/usr/bin/env bun
import { build } from "bun";
import { copyFile } from "fs/promises";

async function buildSDK() {
  console.log("Building OpenLocale SDK...");

  // Build the SDK
  const result = await build({
    entrypoints: ["./src/index.ts"],
    outdir: "./dist",
    target: "node",
    format: "esm",
    external: [
      "zod",
      "fs",
      "fs/promises",
      "path",
      "glob",
      "@/utils/config",
      "@/utils/lockfile",
      "@/utils/cost",
      "@/core/translate-file",
      "@/core/process-files",
      "@/ai/translate",
      "@/parsers",
    ],
  });

  if (!result.success) {
    console.error("Build failed:", result.logs);
    process.exit(1);
  }

  // Copy type definitions
  console.log("Generating type definitions...");
  
  // In a real build, we'd use tsc to generate .d.ts files
  // For now, we'll note this as a TODO
  console.log("TODO: Add TypeScript compilation for type definitions");

  console.log("✓ Build complete");
}

buildSDK().catch(console.error);