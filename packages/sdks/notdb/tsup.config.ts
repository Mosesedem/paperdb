import { defineConfig } from "tsup";

export default defineConfig([
  // ESM and CJS builds for Node.js/bundlers
  {
    entry: ["src/index.ts"],
    format: ["esm", "cjs"],
    dts: true,
    clean: true,
    splitting: false,
    sourcemap: true,
    treeshake: true,
  },
  // UMD/IIFE build for browsers (CDN)
  {
    entry: { "browser.global": "src/index.ts" },
    format: ["iife"],
    globalName: "PaperDB",
    platform: "browser",
    minify: true,
    sourcemap: true,
    outExtension: () => ({ js: ".js" }),
  },
]);
