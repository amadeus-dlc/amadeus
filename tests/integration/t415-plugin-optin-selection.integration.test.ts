// covers: file:packages/framework/core/tools/amadeus-plugin-selection.ts
// size: medium
import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  observePluginSelection,
  resolvePluginSelection,
} from "../../packages/framework/core/tools/amadeus-plugin-selection.ts";

const roots: string[] = [];
function root(): string {
  const value = mkdtempSync(join(tmpdir(), "amadeus-t415-"));
  roots.push(value);
  return value;
}
afterEach(() => {
  for (const value of roots.splice(0)) rmSync(value, { recursive: true, force: true });
});

describe("t415 project plugin selection", () => {
  test("malformed and schema-invalid project configuration fail closed", () => {
    const project = root();
    const host = join(project, ".codex");
    mkdirSync(join(project, "amadeus"), { recursive: true });
    const config = join(project, "amadeus", "config.json");

    writeFileSync(config, "{not-json");
    expect(resolvePluginSelection(host)).toMatchObject({
      kind: "invalid",
      message: expect.stringContaining("configuration is not valid JSON"),
    });

    writeFileSync(
      config,
      JSON.stringify({
        plugin: { activation: { names: "conformance-fixture" } },
      }),
    );
    expect(resolvePluginSelection(host)).toMatchObject({
      kind: "invalid",
      message: expect.stringContaining(
        "plugin.activation.names unique array of valid plugin names",
      ),
    });
  });

  test("selected source with no host state is not-installed", () => {
    const project = root();
    mkdirSync(join(project, "plugins", "conformance-fixture"), { recursive: true });
    expect(
      observePluginSelection(
        project,
        join(project, ".codex"),
        ["conformance-fixture"],
        new Set(),
        new Set(),
      )[0]?.code,
    ).toBe("not-installed");
  });

  test("selected plugin with no project source is source-missing", () => {
    const project = root();
    expect(
      observePluginSelection(
        project,
        join(project, ".codex"),
        ["conformance-fixture"],
        new Set(),
        new Set(),
      )[0]?.code,
    ).toBe("source-missing");
  });

  test("unselected residue is distinguished from an intentional empty project", () => {
    const project = root();
    expect(
      observePluginSelection(
        project,
        join(project, ".codex"),
        [],
        new Set(["conformance-fixture"]),
        new Set(),
      )[0]?.code,
    ).toBe("not-selected");
    expect(
      observePluginSelection(project, join(project, ".codex"), [], new Set(), new Set()),
    ).toEqual([]);
  });

  test("selected staged and composed plugin is current", () => {
    const project = root();
    mkdirSync(join(project, "plugins", "conformance-fixture"), { recursive: true });
    expect(
      observePluginSelection(
        project,
        join(project, ".codex"),
        ["conformance-fixture"],
        new Set(["conformance-fixture"]),
        new Set(["conformance-fixture"]),
      )[0]?.code,
    ).toBe("current");
  });

  test("stale and failed observations take precedence over current surfaces", () => {
    const project = root();
    const plugin = "conformance-fixture";
    const host = join(project, ".codex");
    mkdirSync(join(project, "plugins", plugin), { recursive: true });
    expect(
      observePluginSelection(
        project,
        host,
        [plugin],
        new Set([plugin]),
        new Set([plugin]),
        new Set([plugin]),
      )[0]?.code,
    ).toBe("stale");
    expect(
      observePluginSelection(
        project,
        host,
        [plugin],
        new Set([plugin]),
        new Set([plugin]),
        new Set(),
        new Set([plugin]),
      )[0]?.code,
    ).toBe("failed");
  });
});
