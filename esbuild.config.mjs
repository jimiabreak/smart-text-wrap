import { build, context } from "esbuild";
import { readFileSync, writeFileSync } from "fs";

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

const inlinePlugin = {
  name: "inline-ui-html",
  setup(build) {
    build.onEnd(() => {
      try {
        const html = readFileSync("src/ui.html", "utf8");
        const js = readFileSync("ui.js", "utf8");
        const output = html.replace(
          "<!-- __UI_SCRIPT__ -->",
          `<script>${js}</script>`
        );
        writeFileSync("ui.html", output);
      } catch (e) {
        console.error("Failed to inline UI:", e.message);
      }
    });
  },
};

const uiConfig = {
  ...sharedConfig,
  entryPoints: ["src/ui.ts"],
  outfile: "ui.js",
  plugins: [inlinePlugin],
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
