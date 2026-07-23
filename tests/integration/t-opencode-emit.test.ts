// t-opencode-emit: in-process coverage for the opencode harness emit + manifest
// (packages/framework/harness/opencode/{emit,manifest}.ts). Lives in
// integration/ (scope max = medium): emit() writes to a tmp dir, so the static
// size classifier reads it as medium — the honest scope for an fs-touching test.
//
// covers: file:packages/framework/harness/opencode/emit.ts,
//         file:packages/framework/harness/opencode/manifest.ts
//
// WHY in-process: `bun --coverage` does not instrument spawned subprocesses, so
// the packaging integration path (`bun scripts/package.ts opencode [--check]`,
// exercised by t145 + dist:check) runs emit.ts in a child and cannot cover it.
// The packager only ever calls emit() with check:false (checkHarness diffs the
// built tmp tree against committed, never calling emit's own check branch).
// Driving emit() DIRECTLY here with BOTH check:false (write) and check:true
// (verify) exercises the whole write⇔check symmetric shape in-process — every
// emission (the command, AGENTS.md, opencode.json.example, and the session
// skills) and every helper (emitAgentsMd, emitOpencodeJsonExample, walk,
// rewriteProse). Importing manifest.ts executes its frozen distribution row.

import { describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import type { EmitContext } from "../../scripts/manifest-types.ts";
import emit from "../../packages/framework/harness/opencode/emit.ts";
import manifest from "../../packages/framework/harness/opencode/manifest.ts";

// The real harness-neutral core — session skills are composed from here, so the
// test drives emit() against the actual origin (no fabricated skills tree).
const CORE_ROOT = join(import.meta.dir, "..", "..", "packages", "framework", "core");
const SESSION_SKILLS = [
  "amadeus-session-cost",
  "amadeus-replay",
  "amadeus-outcomes-pack",
  "amadeus-grilling",
  "amadeus-mirror",
];

const COMMAND_BODY = "AUTHORED opencode command body — probe\n";
const COMMAND_REL = join(".opencode", "commands", "amadeus.md");
const AGENTS_REL = "AGENTS.md";
const CONFIG_REL = join(".opencode", "opencode.json.example");

// Enumerate the session-skill emission paths the same way emit() does (recursive
// walk of each core skill dir), so the expected set stays in sync if a skill
// grows a second file.
function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir).sort()) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

function expectedSkillRels(): string[] {
  const rels: string[] = [];
  for (const skill of SESSION_SKILLS) {
    const srcDir = join(CORE_ROOT, "skills", skill);
    for (const file of walk(srcDir)) {
      rels.push(join(".opencode", "skills", skill, relative(srcDir, file)));
    }
  }
  return rels;
}

function expectedRels(): string[] {
  return [COMMAND_REL, AGENTS_REL, CONFIG_REL, ...expectedSkillRels()];
}

// A real-ish EmitContext: coreRoot points at the actual core so the session-skill
// walk resolves; substituteToken does the real {{HARNESS_DIR}} → .opencode swap;
// readHarnessSource is the ONLY stub (the authored command body probe).
function ctxFor(distRoot: string, check: boolean): EmitContext {
  return {
    repoRoot: "/unused",
    coreRoot: CORE_ROOT,
    harnessRoot: "/unused",
    readHarnessSource: (relPath: string): string => {
      expect(relPath).toBe(join("commands", "amadeus.md"));
      return COMMAND_BODY;
    },
    distRoot,
    harnessDir: ".opencode",
    substituteToken: (s: string): string => s.replaceAll("{{HARNESS_DIR}}", ".opencode"),
    check,
  };
}

function relSet(paths: string[], dist: string): string[] {
  return paths.map((p) => relative(dist, p)).sort();
}

describe("opencode emit() — write⇔check symmetry, in-process", () => {
  test("write mode writes every emission (command, AGENTS.md, config, session skills)", () => {
    const dist = mkdtempSync(join(tmpdir(), "oc-emit-write-"));
    try {
      const { written, problems } = emit(ctxFor(dist, false));
      expect(problems).toEqual([]);
      expect(relSet(written, dist)).toEqual(expectedRels().sort());
      // Command body is the authored probe, verbatim (no token substitution).
      expect(readFileSync(join(dist, COMMAND_REL), "utf-8")).toBe(COMMAND_BODY);
      // Every emission exists on disk.
      for (const rel of expectedRels()) expect(existsSync(join(dist, rel))).toBe(true);
    } finally {
      rmSync(dist, { recursive: true, force: true });
    }
  });

  test("check mode is clean after a write (no MISSING/DIFFERS)", () => {
    const dist = mkdtempSync(join(tmpdir(), "oc-emit-clean-"));
    try {
      emit(ctxFor(dist, false));
      const { written, problems } = emit(ctxFor(dist, true));
      expect(problems).toEqual([]);
      expect(relSet(written, dist)).toEqual(expectedRels().sort());
    } finally {
      rmSync(dist, { recursive: true, force: true });
    }
  });

  test("check mode flags MISSING for every emission when the tree is empty (red path)", () => {
    const dist = mkdtempSync(join(tmpdir(), "oc-emit-missing-"));
    try {
      const { problems } = emit(ctxFor(dist, true));
      // One MISSING per emission, and the command's is among them.
      expect(problems.length).toBe(expectedRels().length);
      expect(problems).toContain(`MISSING emission: ${COMMAND_REL}`);
      expect(problems).toContain(`MISSING emission: ${CONFIG_REL}`);
      expect(problems).toContain(`MISSING emission: ${AGENTS_REL}`);
      expect(existsSync(join(dist, COMMAND_REL))).toBe(false);
    } finally {
      rmSync(dist, { recursive: true, force: true });
    }
  });

  test("check mode flags DIFFERS when an emission's content drifts (red path)", () => {
    const dist = mkdtempSync(join(tmpdir(), "oc-emit-differs-"));
    try {
      emit(ctxFor(dist, false));
      writeFileSync(join(dist, CONFIG_REL), "tampered\n");
      const { problems } = emit(ctxFor(dist, true));
      expect(problems).toEqual([`DIFFERS emission: ${CONFIG_REL}`]);
    } finally {
      rmSync(dist, { recursive: true, force: true });
    }
  });
});

describe("opencode emit() — AGENTS.md session guide", () => {
  test("substitutes {{HARNESS_DIR}} and carries the three required threads", () => {
    const dist = mkdtempSync(join(tmpdir(), "oc-emit-agents-"));
    try {
      emit(ctxFor(dist, false));
      const agents = readFileSync(join(dist, AGENTS_REL), "utf-8");
      // No unsubstituted token leaks (the dist grep gate, in-process).
      expect(agents).not.toContain("{{");
      expect(agents).toContain(".opencode/commands/amadeus.md"); // $amadeus 導線
      expect(agents).toContain("$amadeus");
      expect(agents).toContain("active-intent"); // session resumption
      expect(agents).toContain("amadeus-state.md");
      expect(agents).toContain(".opencode/amadeus-rules/"); // method canon
      // The rules rename applied (never a bare .opencode/rules/ segment).
      expect(agents).not.toContain(".opencode/rules/");
    } finally {
      rmSync(dist, { recursive: true, force: true });
    }
  });
});

describe("opencode emit() — opencode.json.example", () => {
  test("is strict JSON with $schema and a narrowing-only permission block", () => {
    const dist = mkdtempSync(join(tmpdir(), "oc-emit-config-"));
    try {
      emit(ctxFor(dist, false));
      const raw = readFileSync(join(dist, CONFIG_REL), "utf-8");
      const parsed = JSON.parse(raw) as { $schema: string; permission: Record<string, string> };
      expect(parsed.$schema).toBe("https://opencode.ai/config.json");
      // Narrowing only: every declared permission tightens to "ask"; the default
      // opencode posture is allow, so no "allow" relaxation is shipped in the example.
      expect(Object.values(parsed.permission)).toEqual(["ask", "ask", "ask"]);
      expect(Object.values(parsed.permission)).not.toContain("allow");
      expect(parsed.permission.edit).toBe("ask");
      expect(parsed.permission.bash).toBe("ask");
      expect(parsed.permission.webfetch).toBe("ask");
    } finally {
      rmSync(dist, { recursive: true, force: true });
    }
  });
});

describe("opencode emit() — session skills", () => {
  test("composes all session skills from core with token substitution", () => {
    const dist = mkdtempSync(join(tmpdir(), "oc-emit-skills-"));
    try {
      emit(ctxFor(dist, false));
      for (const skill of SESSION_SKILLS) {
        const p = join(dist, ".opencode", "skills", skill, "SKILL.md");
        expect(existsSync(p)).toBe(true);
        const body = readFileSync(p, "utf-8");
        expect(body).not.toContain("{{HARNESS_DIR}}");
      }
      // amadeus-replay's core body names the runtime tool under the substituted dir.
      const replay = readFileSync(join(dist, ".opencode", "skills", "amadeus-replay", "SKILL.md"), "utf-8");
      expect(replay).toContain(".opencode/tools/amadeus-runtime.ts");
      // No codex openai.yaml guard is emitted for opencode.
      expect(existsSync(join(dist, ".opencode", "skills", "amadeus-session-cost", "agents", "openai.yaml"))).toBe(false);
    } finally {
      rmSync(dist, { recursive: true, force: true });
    }
  });
});

describe("opencode manifest — the distribution row", () => {
  test("declares the shape (name/harnessDir/rename/skip/exempt)", () => {
    expect(manifest.name).toBe("opencode");
    expect(manifest.harnessDir).toBe(".opencode");
    expect(manifest.rulesRename).toBe("amadeus-rules");
    expect(manifest.skipRunnerGen).toBe(true);
    expect(manifest.authoredExempt).toEqual([]);
    expect(manifest.emit).toBe(emit);
  });

  test("projects the same core dirs as codex, with rules→amadeus-rules", () => {
    const dsts = manifest.coreDirs.map((d) => `${d.src}->${d.dst}`);
    expect(dsts).toEqual([
      "tools->tools",
      "amadeus-common->amadeus-common",
      "knowledge->knowledge",
      "rules->amadeus-rules",
      "sensors->sensors",
      "scopes->scopes",
      "agents->agents",
      "hooks->hooks",
    ]);
  });

  test("routes dot-gitignore to the project-root .gitignore", () => {
    expect(manifest.harnessFiles).toEqual([{ src: "dot-gitignore", dst: ".gitignore", projectRoot: true }]);
  });
});
