// covers: subcommand:amadeus-utility:detect subcommand:amadeus-utility:intent-birth subcommand:amadeus-utility:doctor
// size: small
//
// t249-workspace-inspection.test.ts — in-process pure-function tests for U06
// (FR-3 items 11-12): depth-1 nested-root detection + .gitmodules/submodule
// detection, over the fail-closed WorkspaceScanResult discriminated union.
//
// These drive inspectWorkspace / detectDepthOneProjects / inspectSubmodules /
// parseGitmodules / isSafeSubmodulePath IN-PROCESS through a FAKE ReadOnlyFs
// (no real filesystem — hence the unit tier), so every fail-closed branch
// (root unreadable, signal-metadata unreadable, candidate unreadable, unsafe /
// unparseable .gitmodules) is drivable without staging a real permission race.
// The real-fs adapter (nodeReadOnlyFs) and the CLI projections (detect/birth/
// doctor) are exercised by the integration twin t249.
//
// FAKE-FS NOTE: a directory's signals here are expressed via its TOP-LEVEL
// source files (.ts/.go) or manifest-by-presence (go.mod). The DEEP language
// walk (countLangsInTopDirs) and manifest CONTENT reads (detectFrameworks /
// hasNonDevDeps) intentionally use direct fs, so they are inert against this
// fake — hence a nested candidate whose source lives DEEPER inside it
// (webapp/src/index.ts) and the "root deep walk must not swallow that source"
// FR-3 item 11 path are exercised by the REAL-FS integration twin. A bare
// package.json is likewise NOT a brownfield signal here without its deps read;
// the integration twin covers the real-fs package.json path.

import { describe, expect, test } from "bun:test";
import {
  detectDepthOneProjects,
  inspectSubmodules,
  inspectWorkspace,
  isSafeSubmodulePath,
  parseGitmodules,
} from "../../dist/claude/.claude/tools/amadeus-utility.ts";

type Kind = "file" | "directory" | "symlink";
type FsErr = { kind: "not-found" | "unreadable"; path: string; message: string };
type Res<T> = { ok: true; value: T } | { ok: false; error: FsErr };

// A fake ReadOnlyFs. Directory-listing, file-body, and entry-kind failures are
// injected SEPARATELY so a permission-denied directory (lstat ok, readdir fails)
// can be modelled faithfully.
class FakeFs {
  private dirs = new Map<string, { name: string; kind: Kind }[]>();
  private files = new Map<string, string>();
  private kinds = new Map<string, Kind>();
  private dirErr = new Map<string, "not-found" | "unreadable">();
  private fileErr = new Map<string, "not-found" | "unreadable">();
  private entryErr = new Map<string, "not-found" | "unreadable">();

  dir(path: string, entries: [string, Kind][]): this {
    this.dirs.set(path, entries.map(([name, kind]) => ({ name, kind })));
    for (const [name, kind] of entries) this.kinds.set(`${path}/${name}`, kind);
    this.kinds.set(path, "directory");
    return this;
  }
  file(path: string, content: string): this {
    this.files.set(path, content);
    this.kinds.set(path, "file");
    return this;
  }
  mark(path: string, kind: Kind): this {
    this.kinds.set(path, kind);
    return this;
  }
  failDir(path: string, kind: "not-found" | "unreadable" = "unreadable"): this {
    this.dirErr.set(path, kind);
    this.kinds.set(path, "directory"); // lstat still succeeds
    return this;
  }
  failFile(path: string, kind: "not-found" | "unreadable" = "unreadable"): this {
    this.fileErr.set(path, kind);
    return this;
  }
  failEntry(path: string, kind: "not-found" | "unreadable" = "unreadable"): this {
    this.entryErr.set(path, kind);
    return this;
  }

  readDirectory(path: string): Res<readonly { name: string; kind: Kind }[]> {
    const e = this.dirErr.get(path);
    if (e) return { ok: false, error: { kind: e, path, message: `forced ${e}` } };
    const entries = this.dirs.get(path);
    if (!entries) return { ok: false, error: { kind: "not-found", path, message: "no dir" } };
    return { ok: true, value: entries };
  }
  readTextFile(path: string): Res<string> {
    const e = this.fileErr.get(path);
    if (e) return { ok: false, error: { kind: e, path, message: `forced ${e}` } };
    const body = this.files.get(path);
    if (body === undefined) return { ok: false, error: { kind: "not-found", path, message: "no file" } };
    return { ok: true, value: body };
  }
  inspectEntry(path: string): Res<Kind> {
    const e = this.entryErr.get(path);
    if (e) return { ok: false, error: { kind: e, path, message: `forced ${e}` } };
    const k = this.kinds.get(path);
    if (!k) return { ok: false, error: { kind: "not-found", path, message: "no entry" } };
    return { ok: true, value: k };
  }
}

describe("parseGitmodules", () => {
  test("parses sections, path, url; ignores comments and unknown keys", () => {
    const out = parseGitmodules(
      [
        "# a comment",
        "; another comment",
        '[submodule "libs/a"]',
        "\tpath = libs/a",
        "\turl = https://example.com/a.git",
        "\tbranch = main", // unknown key ignored
        '[submodule "b"]',
        "\tpath = vendor/b",
      ].join("\n"),
    );
    expect(out).toEqual([
      { name: "libs/a", path: "libs/a", url: "https://example.com/a.git" },
      { name: "b", path: "vendor/b" },
    ]);
  });

  test("drops entries with no path; tolerates CRLF and non-submodule sections", () => {
    const out = parseGitmodules(
      ["[core]", "\tbar = baz", '[submodule "c"]', "\turl = only-url"].join("\r\n"),
    );
    expect(out).toEqual([]);
  });

  test("a key line before any section is ignored (no crash)", () => {
    expect(parseGitmodules("path = orphan\n")).toEqual([]);
  });
});

describe("isSafeSubmodulePath", () => {
  test("accepts relative contained paths", () => {
    expect(isSafeSubmodulePath("libs/a")).toBe(true);
    expect(isSafeSubmodulePath("libs\\a")).toBe(true);
  });
  test("rejects empty, absolute, drive-absolute, and traversal", () => {
    expect(isSafeSubmodulePath("")).toBe(false);
    expect(isSafeSubmodulePath("/abs")).toBe(false);
    expect(isSafeSubmodulePath("\\unc")).toBe(false);
    expect(isSafeSubmodulePath("C:/win")).toBe(false);
    expect(isSafeSubmodulePath("a/../b")).toBe(false);
  });
});

describe("inspectSubmodules", () => {
  test("absent .gitmodules => present:false, no submodules", () => {
    const fs = new FakeFs().dir("/ws", []);
    const r = inspectSubmodules("/ws", fs as never);
    expect(r.present).toBe(false);
    expect(r.submodules).toEqual([]);
    expect(r.blocking).toBeUndefined();
  });

  test("present + safe entries: initialized from path/.git, sorted, url kept", () => {
    const fs = new FakeFs()
      .file("/ws/.gitmodules", '[submodule "z"]\npath = z\nurl = u-z\n[submodule "a"]\npath = a\n')
      .mark("/ws/a/.git", "directory"); // a initialized; z has no .git
    const r = inspectSubmodules("/ws", fs as never);
    expect(r.blocking).toBeUndefined();
    expect(r.submodules).toEqual([
      { name: "a", path: "a", initialized: true },
      { name: "z", path: "z", url: "u-z", initialized: false },
    ]);
  });

  test("unsafe path => blocking UNPARSEABLE_GITMODULES (no submodules)", () => {
    const fs = new FakeFs().file("/ws/.gitmodules", '[submodule "bad"]\npath = ../escape\n');
    const r = inspectSubmodules("/ws", fs as never);
    expect(r.submodules).toEqual([]);
    expect(r.blocking?.code).toBe("UNPARSEABLE_GITMODULES");
  });

  test("present but zero parseable entries => blocking", () => {
    const fs = new FakeFs().file("/ws/.gitmodules", "# only comments\n");
    expect(inspectSubmodules("/ws", fs as never).blocking?.code).toBe("UNPARSEABLE_GITMODULES");
  });

  test("present but unreadable => blocking", () => {
    const fs = new FakeFs().failFile("/ws/.gitmodules", "unreadable");
    expect(inspectSubmodules("/ws", fs as never).blocking?.code).toBe("UNPARSEABLE_GITMODULES");
  });
});

describe("detectDepthOneProjects", () => {
  const rootEntries = [
    { name: "webapp", kind: "directory" as const },
    { name: "docs", kind: "directory" as const }, // excluded (docs-style)
    { name: "src", kind: "directory" as const }, // excluded (known source dir)
    { name: ".hidden", kind: "directory" as const }, // excluded (hidden)
    { name: "node_modules", kind: "directory" as const }, // excluded
    { name: "link", kind: "symlink" as const }, // excluded (symlink)
    { name: "README.md", kind: "file" as const }, // excluded (non-dir)
  ];

  test("single brownfield candidate becomes a hit; excluded dirs skipped", () => {
    const fs = new FakeFs().dir("/ws/webapp", [["index.ts", "file"]]);
    const r = detectDepthOneProjects("/ws", rootEntries, fs as never);
    expect(r.blocking).toBeUndefined();
    expect(r.candidates.map((c) => c.path)).toEqual(["webapp"]);
  });

  test("candidate directory unreadable => blocking CANDIDATE_UNREADABLE", () => {
    const fs = new FakeFs().failDir("/ws/webapp", "unreadable");
    const r = detectDepthOneProjects("/ws", rootEntries, fs as never);
    expect(r.candidates).toEqual([]);
    expect(r.blocking?.code).toBe("CANDIDATE_UNREADABLE");
  });

  test("non-brownfield candidate is not a hit", () => {
    const fs = new FakeFs().dir("/ws/webapp", [["notes.txt", "file"]]);
    expect(detectDepthOneProjects("/ws", rootEntries, fs as never).candidates).toEqual([]);
  });
});

// Root listing where /ws itself carries a top-level TypeScript source file.
function brownfieldRoot(): FakeFs {
  return new FakeFs().dir("/ws", [["main.ts", "file"]]);
}

describe("inspectWorkspace fail-closed classification", () => {
  test("ENOENT root => classified Greenfield (scaffold-first path)", () => {
    const fs = new FakeFs(); // /ws not registered => readDirectory not-found
    const r = inspectWorkspace("/ws", fs as never);
    expect(r.kind).toBe("classified");
    if (r.kind === "classified") expect(r.scan.projectType).toBe("Greenfield");
  });

  test("root unreadable (non-ENOENT) => inconclusive ROOT_UNREADABLE", () => {
    const fs = new FakeFs().failDir("/ws", "unreadable");
    const r = inspectWorkspace("/ws", fs as never);
    expect(r.kind).toBe("inconclusive");
    if (r.kind === "inconclusive") expect(r.scan.advisories[0].code).toBe("ROOT_UNREADABLE");
  });

  test("empty root => classified Greenfield", () => {
    const r = inspectWorkspace("/ws", new FakeFs().dir("/ws", []) as never);
    expect(r.kind).toBe("classified");
    if (r.kind === "classified") {
      expect(r.scan.projectType).toBe("Greenfield");
      expect(r.scan.nestedRoot).toBeUndefined();
    }
  });

  test("root signal => Brownfield, no depth-1 fallback", () => {
    const r = inspectWorkspace("/ws", brownfieldRoot() as never);
    expect(r.kind).toBe("classified");
    if (r.kind === "classified") {
      expect(r.scan.projectType).toBe("Brownfield");
      expect(r.scan.nestedCandidates).toEqual([]);
      expect(r.scan.languages).toContain("TypeScript");
    }
  });

  test("signal metadata unreadable => inconclusive", () => {
    const fs = new FakeFs().dir("/ws", [["weird", "file"]]).failEntry("/ws/weird", "unreadable");
    const r = inspectWorkspace("/ws", fs as never);
    expect(r.kind).toBe("inconclusive");
    if (r.kind === "inconclusive") expect(r.scan.advisories[0].code).toBe("SIGNAL_METADATA_UNREADABLE");
  });

  test("unsafe .gitmodules wins over root signal (inconclusive)", () => {
    const fs = brownfieldRoot().file("/ws/.gitmodules", '[submodule "b"]\npath = /abs\n');
    const r = inspectWorkspace("/ws", fs as never);
    expect(r.kind).toBe("inconclusive");
    if (r.kind === "inconclusive")
      expect(r.scan.advisories.map((a) => a.code)).toContain("UNPARSEABLE_GITMODULES");
  });

  test("safe submodule on greenfield root => Brownfield, no fallback, uninit advisory", () => {
    const fs = new FakeFs()
      .dir("/ws", [["README.md", "file"]])
      .file("/ws/README.md", "# hi")
      .file("/ws/.gitmodules", '[submodule "libs/a"]\npath = libs/a\n'); // no .git => uninitialized
    const r = inspectWorkspace("/ws", fs as never);
    expect(r.kind).toBe("classified");
    if (r.kind === "classified") {
      expect(r.scan.projectType).toBe("Brownfield");
      expect(r.scan.submodules).toEqual([{ name: "libs/a", path: "libs/a", initialized: false }]);
      expect(r.scan.advisories.map((a) => a.code)).toContain("UNINITIALIZED_SUBMODULES");
      expect(r.scan.nestedCandidates).toEqual([]);
    }
  });

  test("single nested project => nestedRoot set", () => {
    const fs = new FakeFs()
      .dir("/ws", [["webapp", "directory"]])
      .dir("/ws/webapp", [["index.ts", "file"]]);
    const r = inspectWorkspace("/ws", fs as never);
    expect(r.kind).toBe("classified");
    if (r.kind === "classified") {
      expect(r.scan.projectType).toBe("Brownfield");
      expect(r.scan.nestedRoot).toBe("webapp");
      expect(r.scan.nestedCandidates.map((c) => c.path)).toEqual(["webapp"]);
      expect(r.scan.languages).toContain("TypeScript");
    }
  });

  // FR-3 item 11 decision boundary: a root that carries its OWN first-class
  // source signal (a top-level source file) stays Brownfield with NO fallback
  // even when a candidate dir is also present — the candidate-dir exclusion in
  // the root's own-signal computation must not swallow root-level source.
  test("root-level source wins over a present candidate dir (no fallback)", () => {
    const fs = new FakeFs()
      .dir("/ws", [["main.ts", "file"], ["webapp", "directory"]])
      .dir("/ws/webapp", [["index.ts", "file"]]);
    const r = inspectWorkspace("/ws", fs as never);
    expect(r.kind).toBe("classified");
    if (r.kind === "classified") {
      expect(r.scan.projectType).toBe("Brownfield");
      expect(r.scan.nestedRoot).toBeUndefined();
      expect(r.scan.nestedCandidates).toEqual([]);
      expect(r.scan.languages).toContain("TypeScript");
    }
  });

  test("multiple nested projects => no nestedRoot, MULTIPLE_NESTED_PROJECTS advisory", () => {
    const fs = new FakeFs()
      .dir("/ws", [
        ["api", "directory"],
        ["web", "directory"],
      ])
      .dir("/ws/api", [["main.go", "file"], ["go.mod", "file"]])
      .dir("/ws/web", [["app.ts", "file"]]);
    const r = inspectWorkspace("/ws", fs as never);
    expect(r.kind).toBe("classified");
    if (r.kind === "classified") {
      expect(r.scan.nestedRoot).toBeUndefined();
      expect(r.scan.nestedCandidates.map((c) => c.path)).toEqual(["api", "web"]);
      expect(r.scan.advisories.map((a) => a.code)).toContain("MULTIPLE_NESTED_PROJECTS");
      // Aggregated languages across hits (Go from api + TypeScript from web).
      expect(r.scan.languages).toContain("Go");
      expect(r.scan.languages).toContain("TypeScript");
    }
  });

  test("candidate unreadable during fallback => inconclusive CANDIDATE_UNREADABLE", () => {
    const fs = new FakeFs().dir("/ws", [["webapp", "directory"]]).failDir("/ws/webapp", "unreadable");
    const r = inspectWorkspace("/ws", fs as never);
    expect(r.kind).toBe("inconclusive");
    if (r.kind === "inconclusive") expect(r.scan.advisories[0].code).toBe("CANDIDATE_UNREADABLE");
  });

  test("candidate listing ok but an inner entry unreadable => CANDIDATE_UNREADABLE", () => {
    // readDirectory(webapp) succeeds, but inspectEntry of a child fails — the
    // candidate-internal signal-metadata read failure path.
    const fs = new FakeFs()
      .dir("/ws", [["webapp", "directory"]])
      .dir("/ws/webapp", [["weird", "file"]])
      .failEntry("/ws/webapp/weird", "unreadable");
    const r = inspectWorkspace("/ws", fs as never);
    expect(r.kind).toBe("inconclusive");
    if (r.kind === "inconclusive") expect(r.scan.advisories[0].code).toBe("CANDIDATE_UNREADABLE");
  });
});
