import { build, context } from "esbuild";
import { readFileSync, writeFileSync, rmSync } from "fs";

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
    build.onEnd((result) => {
      try {
        if (result.errors.length > 0) {
          rmSync("ui.html", { force: true });
          return;
        }
        const html = readFileSync("src/ui.html", "utf8");
        const js = readFileSync("ui.js", "utf8");
        const marker = "<!-- __UI_SCRIPT__ -->";
        if (html.split(marker).length !== 2) {
          throw new Error("UI HTML must contain exactly one script insertion marker");
        }
        const output = html.replace(
          marker,
          () => `<script>${js}</script>`
        );
        writeFileSync("ui.html", output);
      } catch (e) {
        rmSync("ui.html", { force: true });
        return { errors: [{ text: `Failed to inline UI: ${e.message}` }] };
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
