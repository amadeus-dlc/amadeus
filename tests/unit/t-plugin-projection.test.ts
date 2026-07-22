// covers: file:scripts/plugin-projection.ts
// covers: file:scripts/harness-transform.ts
// size: small
//
// U09 plugin-projection (FR-6 item 19) — pure in-process unit tests for the C5
// distribution projector: source discovery (canonical sort via a fake fs),
// structural validation (malformed / duplicate / unsafe path), path-collision
// guard, per-harness host projection (token + rules-rename transform), the
// harness-neutral bundle (verbatim bytes), byte/unreferenced drift derivation,
// and the self-install closed-four union boundary. Touches no filesystem,
// process, or socket — hence `// size: small`.
//
// Falling/passing evidence: validatePluginSources over a manifest-less source
// throws (red-relevant), and over a well-formed set returns it (green); the
// self-install guard rejects kiro/kiro-ide and accepts the closed four.

import { describe, expect, test } from "bun:test";
import {
  assertNoPathCollisions,
  assertSelfInstallHarness,
  buildHarnessTree,
  buildPluginBundle,
  buildSelfInstallProjection,
  deriveByteDrift,
  deriveUnreferenced,
  discoverPluginSources,
  isSelfInstallHarness,
  isUnsafeRelativePath,
  PACKAGE_HARNESSES,
  PLUGIN_MANIFEST,
  PluginValidationError,
  type PluginSource,
  pluginHostPrefix,
  projectPluginArtifacts,
  type ProjectedArtifact,
  SELF_INSTALL_HARNESSES,
  validatePluginSources,
} from "../../scripts/plugin-projection.ts";
import type { HarnessManifest } from "../../scripts/manifest-types.ts";

// A minimal manifest stub — buildHarnessTree only reads name/harnessDir/rulesRename.
function stubManifest(name: string, harnessDir: string, rulesRename: string | null): HarnessManifest {
  return {
    name,
    harnessDir,
    rulesRename,
    coreDirs: [],
    harnessFiles: [],
    authoredExempt: [],
  } as unknown as HarnessManifest;
}

// ---------------------------------------------------------------------------
// A pure in-memory ReadOnlyFs over a flat path→content map. A path is a
// directory when it is not a file yet some file lives beneath it.
// ---------------------------------------------------------------------------
function makeFakeFs(files: Record<string, string>) {
  const isFile = (p: string) => Object.hasOwn(files, p);
  const hasChild = (p: string) => Object.keys(files).some((f) => f.startsWith(`${p}/`));
  return {
    exists: (p: string) => isFile(p) || hasChild(p),
    isDir: (p: string) => !isFile(p) && hasChild(p),
    read: (p: string) => Buffer.from(files[p] ?? "", "utf-8"),
    list: (p: string) => {
      const prefix = `${p}/`;
      const names = new Set<string>();
      for (const f of Object.keys(files)) {
        if (!f.startsWith(prefix)) continue;
        names.add(f.slice(prefix.length).split("/")[0]);
      }
      return [...names];
    },
  };
}

// A hand-built PluginSource fixture (no fs), for the pure projection functions.
function fixturePlugin(name: string, artifacts: Record<string, string>): PluginSource {
  const root = `/plugins/${name}`;
  const arts = Object.entries(artifacts).map(([relativePath, content]) => ({
    relativePath,
    bytes: Buffer.from(content, "utf-8"),
    sourcePath: `${root}/${relativePath}`,
  }));
  const manifest = arts.find((a) => a.relativePath === PLUGIN_MANIFEST);
  return {
    sourceRoot: root,
    directoryName: name,
    manifestBytes: manifest ? manifest.bytes : Buffer.alloc(0),
    artifacts: arts,
  };
}

describe("discoverPluginSources", () => {
  test("absent root → empty (the 0-plugin baseline)", () => {
    const io = makeFakeFs({});
    expect(discoverPluginSources("/plugins", io)).toEqual([]);
  });

  test("canonical sort of plugin names and artifact paths, filesystem order ignored", () => {
    // Insertion order deliberately reversed from sorted order.
    const io = makeFakeFs({
      "/plugins/zeta/plugin.json": "{}",
      "/plugins/zeta/skills/z.md": "z",
      "/plugins/alpha/plugin.json": "{}",
      "/plugins/alpha/b/two.md": "2",
      "/plugins/alpha/a/one.md": "1",
    });
    const sources = discoverPluginSources("/plugins", io);
    expect(sources.map((s) => s.directoryName)).toEqual(["alpha", "zeta"]);
    expect(sources[0].artifacts.map((a) => a.relativePath)).toEqual([
      "a/one.md",
      "b/two.md",
      "plugin.json",
    ]);
    // Manifest bytes are captured from plugin.json.
    expect(sources[0].manifestBytes.toString("utf-8")).toBe("{}");
  });

  test("a dir without plugin.json still discovers (empty manifestBytes) so validation can reject", () => {
    const io = makeFakeFs({ "/plugins/nomani/skills/a.md": "a" });
    const sources = discoverPluginSources("/plugins", io);
    expect(sources).toHaveLength(1);
    expect(sources[0].manifestBytes.length).toBe(0);
  });
});

describe("validatePluginSources", () => {
  test("well-formed sources pass through unchanged", () => {
    const p = fixturePlugin("ok", { "plugin.json": "{}", "skills/a.md": "a" });
    expect(validatePluginSources([p])).toEqual([p]);
  });

  test("missing manifest → MALFORMED (loud, no partial write)", () => {
    const p = fixturePlugin("nomani", { "skills/a.md": "a" });
    expect(() => validatePluginSources([p])).toThrow(PluginValidationError);
    try {
      validatePluginSources([p]);
    } catch (e) {
      expect((e as PluginValidationError).problems.some((m) => m.includes("MALFORMED"))).toBe(true);
    }
  });

  test("duplicate identity → DUPLICATE", () => {
    const a = fixturePlugin("dup", { "plugin.json": "{}" });
    const b = fixturePlugin("dup", { "plugin.json": "{}" });
    try {
      validatePluginSources([a, b]);
      throw new Error("expected throw");
    } catch (e) {
      expect(e).toBeInstanceOf(PluginValidationError);
      expect((e as PluginValidationError).problems.some((m) => m.includes("DUPLICATE"))).toBe(true);
    }
  });

  test("unsafe artifact path → UNSAFE", () => {
    const p: PluginSource = {
      sourceRoot: "/plugins/evil",
      directoryName: "evil",
      manifestBytes: Buffer.from("{}"),
      artifacts: [
        { relativePath: "plugin.json", bytes: Buffer.from("{}"), sourcePath: "/plugins/evil/plugin.json" },
        { relativePath: "../escape.md", bytes: Buffer.from("x"), sourcePath: "/plugins/evil/../escape.md" },
      ],
    };
    expect(() => validatePluginSources([p])).toThrow(PluginValidationError);
  });
});

describe("isUnsafeRelativePath", () => {
  test("flags escapes and accepts nested relative paths", () => {
    expect(isUnsafeRelativePath("a/b.md")).toBe(false);
    expect(isUnsafeRelativePath("plugin.json")).toBe(false);
    expect(isUnsafeRelativePath("")).toBe(true);
    expect(isUnsafeRelativePath("/abs.md")).toBe(true);
    expect(isUnsafeRelativePath("C:/win.md")).toBe(true);
    expect(isUnsafeRelativePath("a/../b.md")).toBe(true);
    expect(isUnsafeRelativePath("a/./b.md")).toBe(true);
    expect(isUnsafeRelativePath("a//b.md")).toBe(true);
  });
});

describe("assertNoPathCollisions", () => {
  test("passes when every output path has one owner", () => {
    const arts: ProjectedArtifact[] = [
      { owner: "a", relativePath: "plugins/a/x.md", bytes: Buffer.from("1"), sourcePath: "s1" },
      { owner: "b", relativePath: "plugins/b/x.md", bytes: Buffer.from("2"), sourcePath: "s2" },
    ];
    expect(() => assertNoPathCollisions(arts)).not.toThrow();
  });

  test("throws when two owners claim the same output path", () => {
    const arts: ProjectedArtifact[] = [
      { owner: "a", relativePath: "plugins/x.md", bytes: Buffer.from("1"), sourcePath: "s1" },
      { owner: "b", relativePath: "plugins/x.md", bytes: Buffer.from("2"), sourcePath: "s2" },
    ];
    expect(() => assertNoPathCollisions(arts)).toThrow(PluginValidationError);
  });
});

describe("projectPluginArtifacts + buildPluginBundle", () => {
  const plugin = fixturePlugin("pro", {
    "plugin.json": "{}",
    "skills/s.md": "dir {{HARNESS_DIR}} rules {{HARNESS_DIR}}/rules/x",
    "data/d.json": "{{HARNESS_DIR}}", // .json is verbatim — token NOT substituted
  });

  test("host projection substitutes the token on prose, leaves .json verbatim, and namespaces under plugins/<name>/", () => {
    const arts = projectPluginArtifacts(plugin, "claude", ".claude", null);
    const byPath = new Map(arts.map((a) => [a.relativePath, a.bytes.toString("utf-8")]));
    expect([...byPath.keys()]).toEqual([
      "plugins/pro/data/d.json",
      "plugins/pro/plugin.json",
      "plugins/pro/skills/s.md",
    ]);
    expect(byPath.get("plugins/pro/skills/s.md")).toBe("dir .claude rules .claude/rules/x");
    expect(byPath.get("plugins/pro/data/d.json")).toBe("{{HARNESS_DIR}}"); // verbatim
    expect(arts.every((a) => a.harness === "claude" && a.owner === "pro")).toBe(true);
  });

  test("rules-rename harness rewrites <harnessDir>/rules/ after token substitution", () => {
    const arts = projectPluginArtifacts(plugin, "kiro", ".kiro", "steering");
    const s = arts.find((a) => a.relativePath === "plugins/pro/skills/s.md")!;
    expect(s.bytes.toString("utf-8")).toBe("dir .kiro rules .kiro/steering/x");
  });

  test("neutral bundle keeps source bytes verbatim (no token substitution)", () => {
    const bundle = buildPluginBundle(plugin);
    const s = bundle.find((a) => a.relativePath === "plugins/pro/skills/s.md")!;
    expect(s.bytes.toString("utf-8")).toBe("dir {{HARNESS_DIR}} rules {{HARNESS_DIR}}/rules/x");
    expect(s.harness).toBeUndefined();
    expect(bundle.map((a) => a.relativePath)).toEqual([
      "plugins/pro/data/d.json",
      "plugins/pro/plugin.json",
      "plugins/pro/skills/s.md",
    ]);
  });

  test("pluginHostPrefix namespaces by name", () => {
    expect(pluginHostPrefix("x")).toBe("plugins/x");
  });
});

describe("buildHarnessTree", () => {
  const plugin = fixturePlugin("bt", { "plugin.json": "{}", "skills/s.md": "at {{HARNESS_DIR}}" });

  test("empty plugins → empty contribution (byte-identical baseline)", () => {
    const r = buildHarnessTree(stubManifest("claude", ".claude", null), []);
    expect(r.expectedPaths.size).toBe(0);
    expect(r.readSources.size).toBe(0);
    expect(r.outsideHarness).toEqual([]);
  });

  test("expected paths are harness-dir-prefixed and read-set records each source", () => {
    const r = buildHarnessTree(stubManifest("claude", ".claude", null), [plugin]);
    expect([...r.expectedPaths].sort()).toEqual([
      ".claude/plugins/bt/plugin.json",
      ".claude/plugins/bt/skills/s.md",
    ]);
    expect([...r.readSources].sort()).toEqual([
      "/plugins/bt/plugin.json",
      "/plugins/bt/skills/s.md",
    ]);
    expect(r.outsideHarness).toEqual([]);
  });
});

describe("deriveByteDrift", () => {
  test("classifies MISSING / DIFFERS / ORPHAN and sorts by path", () => {
    const expected = new Map<string, Buffer>([
      ["plugins/a/keep.md", Buffer.from("same")],
      ["plugins/a/changed.md", Buffer.from("new")],
      ["plugins/a/missing.md", Buffer.from("want")],
    ]);
    const committed = new Map<string, Buffer>([
      ["plugins/a/keep.md", Buffer.from("same")],
      ["plugins/a/changed.md", Buffer.from("old")],
      ["plugins/a/orphan.md", Buffer.from("stale")],
    ]);
    expect(deriveByteDrift(expected, committed)).toEqual([
      { kind: "DIFFERS", path: "plugins/a/changed.md" },
      { kind: "MISSING", path: "plugins/a/missing.md" },
      { kind: "ORPHAN", path: "plugins/a/orphan.md" },
    ]);
  });

  test("identical trees → no drift", () => {
    const m = new Map<string, Buffer>([["p", Buffer.from("x")]]);
    expect(deriveByteDrift(m, new Map([["p", Buffer.from("x")]]))).toEqual([]);
  });
});

describe("deriveUnreferenced", () => {
  test("returns discovered sources absent from the read-set, sorted", () => {
    const read = new Set(["/s/a", "/s/c"]);
    expect(deriveUnreferenced(["/s/c", "/s/b", "/s/a"], read)).toEqual(["/s/b"]);
  });

  test("all read → empty", () => {
    const read = new Set(["/s/a"]);
    expect(deriveUnreferenced(["/s/a"], read)).toEqual([]);
  });
});

describe("self-install closed union", () => {
  test("the four faces are a strict subset of the six package faces", () => {
    for (const h of SELF_INSTALL_HARNESSES) expect(PACKAGE_HARNESSES).toContain(h);
    expect(SELF_INSTALL_HARNESSES).toHaveLength(4);
    expect(PACKAGE_HARNESSES).toHaveLength(6);
  });

  test("isSelfInstallHarness accepts the four, rejects kiro/kiro-ide", () => {
    for (const h of ["claude", "codex", "cursor", "opencode"]) expect(isSelfInstallHarness(h)).toBe(true);
    for (const h of ["kiro", "kiro-ide", "unknown"]) expect(isSelfInstallHarness(h)).toBe(false);
  });

  test("assertSelfInstallHarness / buildSelfInstallProjection reject kiro-ide loudly", () => {
    expect(() => assertSelfInstallHarness("kiro-ide")).toThrow(PluginValidationError);
    expect(() => buildSelfInstallProjection("kiro" as never)).toThrow(PluginValidationError);
    const r = buildSelfInstallProjection("claude");
    expect(r.expectedPaths.size).toBe(0);
    expect(r.outsideHarness).toEqual([]);
  });
});
