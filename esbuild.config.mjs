import { build, context } from "esbuild";

const isWatch = process.argv.includes("--watch");

const sharedConfig = {
  bundle: true,
  format: "iife",
  target: "es2017",
  logLevel: "info",
};

const codeConfig = {
  ...sharedConfig,
  entryPoints: ["src/code.ts"],
  outfile: "code.js",
};

const uiConfig = {
  ...sharedConfig,
  entryPoints: ["src/ui.ts"],
  outfile: "ui.js",
};

if (isWatch) {
  const codeCtx = await context(codeConfig);
  const uiCtx = await context(uiConfig);
  await codeCtx.watch();
  await uiCtx.watch();
  console.log("Watching for changes...");
} else {
  await build(codeConfig);
  await build(uiConfig);
}
