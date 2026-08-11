// covers: dir:packages/framework/core, dir:plugins
// size: medium

import { describe, expect, test } from "bun:test";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = join(import.meta.dir, "..", "..");
const CORE = join(ROOT, "packages", "framework", "core");
const PLUGINS = join(ROOT, "plugins");

function filesBelow(root: string): string[] {
  return readdirSync(root)
    .flatMap((name) => {
      const path = join(root, name);
      return statSync(path).isDirectory() ? filesBelow(path) : [path];
    })
    .sort();
}

describe("plugin dependency boundary", () => {
  test("core names no concrete plugin", () => {
    const pluginNames = readdirSync(PLUGINS)
      .filter((name) => statSync(join(PLUGINS, name)).isDirectory())
      .filter((name) => existsSync(join(PLUGINS, name, "plugin.json")));
    const violations = filesBelow(CORE).flatMap((path) => {
      const haystack = `${relative(CORE, path)}\n${readFileSync(path, "utf8")}`;
      return pluginNames
        .filter((name) => haystack.includes(name))
        .map((name) => `${relative(ROOT, path)} -> ${name}`);
    });

    expect(violations).toEqual([]);
  });

  test("plugins leave workflow scope assignment to the host", () => {
    for (const plugin of readdirSync(PLUGINS)) {
      const manifestPath = join(PLUGINS, plugin, "plugin.json");
      if (!statSync(join(PLUGINS, plugin)).isDirectory() || !existsSync(manifestPath)) continue;
      const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as { stages?: { path?: string }[] };
      for (const stage of manifest.stages ?? []) {
        const text = readFileSync(join(PLUGINS, plugin, stage.path ?? ""), "utf8");
        const frontmatter = text.split("---")[1] ?? "";
        expect(frontmatter).toMatch(/scopes:\s*\[\]/);
      }
    }
  });
});
