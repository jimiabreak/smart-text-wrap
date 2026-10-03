import { describe, expect, it } from "vitest";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

function buildFixture(html?: string) {
  const directory = mkdtempSync(join(tmpdir(), "smart-text-wrap-build-"));
  try {
    copyFileSync("esbuild.config.mjs", join(directory, "esbuild.config.mjs"));
    symlinkSync(resolve("node_modules"), join(directory, "node_modules"), "dir");
    mkdirSync(join(directory, "src"));
    writeFileSync(join(directory, "src/code.ts"), "console.log('main');");
    writeFileSync(join(directory, "src/ui.ts"), "console.log('$&');");
    if (html !== undefined) writeFileSync(join(directory, "src/ui.html"), html);
    writeFileSync(join(directory, "ui.html"), "stale output");
    const result = spawnSync(process.execPath, ["esbuild.config.mjs"], { cwd: directory, encoding: "utf8" });
    const output = existsSync(join(directory, "ui.html")) ? readFileSync(join(directory, "ui.html"), "utf8") : undefined;
    return { status: result.status, output, stderr: result.stderr };
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

describe("UI build output", () => {
  it("fails and removes stale output when the template is missing", () => {
    const result = buildFixture();
    expect(result.status).not.toBe(0);
    expect(result.output).toBeUndefined();
    expect(result.stderr).toContain("Failed to inline UI");
  });

  it.each(["<body>No marker</body>", "<!-- __UI_SCRIPT__ --><!-- __UI_SCRIPT__ -->"])("rejects an invalid insertion marker: %s", (html) => {
    const result = buildFixture(html);
    expect(result.status).not.toBe(0);
    expect(result.output).toBeUndefined();
    expect(result.stderr).toContain("exactly one script insertion marker");
  });

  it("inlines JavaScript literally into a valid template", () => {
    const result = buildFixture("<body><!-- __UI_SCRIPT__ --></body>");
    expect(result.status).toBe(0);
    expect(result.output).toContain("$&");
    expect(result.output).not.toContain("__UI_SCRIPT__");
    expect(result.output).toContain("<script>");
  });
});
