// t150-codex-packaging: dist/codex parity + drift guard + trust-seed recipe.
//
// covers: file:tools/amadeus-lib.ts
//
// WHAT. Three contracts land here:
//   (1) The committed dist/codex tree is byte-identical to what
//       `bun scripts/package.ts codex` regenerates from dist/claude/.claude
//       (modulo the script's single sanctioned prefix-transform class).
//       Drift fails with the regen command — same UX as amadeus-runner-gen
//       check and kiro's t141.
//   (2) Core parity: every .ts under dist/codex/.codex/tools/ and the core
//       hook bodies are BYTE-IDENTICAL to their dist/claude sources (the
//       architecture-B invariant: the generator may transform prose/data
//       paths, never code).
//   (3) The S9a trust-hash recipe in the packager reproduces the hash the
//       spike recorded live (findings §S9a) — the installer pre-seed is only
//       sound while this stays true.
//
// WHY SUBPROCESS. Same idiom as kiro's t141: the packager is a CLI; we pin
// its observable behavior, not its internals.

import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { REPO_ROOT } from "../harness/fixtures.ts";

const PACKAGE_SCRIPT = join(REPO_ROOT, "scripts", "package.ts");
const CLAUDE_SRC = join(REPO_ROOT, "dist", "claude", ".claude");
const CODEX_DST = join(REPO_ROOT, "dist", "codex", ".codex");

function* walk(dir: string): Generator<string> {
  for (const entry of readdirSync(dir).sort()) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) yield* walk(full);
    else yield full;
  }
}

describe("t150 dist/codex packaging parity + drift guard", () => {
  test("1: committed dist/codex matches the packaging script (drift guard)", () => {
    const r = spawnSync("bun", [PACKAGE_SCRIPT, "codex", "--check"], {
      encoding: "utf-8",
      cwd: REPO_ROOT,
    });
    if (r.status !== 0) {
      // Surface the script's own stale-file list — it names the fix.
      console.error(r.stderr);
    }
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("in sync");
  });

  test("2: every packaged .ts file is byte-identical to its dist/claude source (code is never transformed)", () => {
    // tools/ + hooks/ carry the deterministic core. The codex adapter
    // (authored shell, amadeus-codex-*.ts) has no claude counterpart and is
    // exempt; everything else must match its source byte-for-byte.
    const divergent: string[] = [];
    for (const sub of ["tools", "hooks"]) {
      const dstDir = join(CODEX_DST, sub);
      for (const file of walk(dstDir)) {
        if (!file.endsWith(".ts")) continue;
        if (/amadeus-codex-[^/]+\.ts$/.test(file)) continue;
        const rel = file.slice(dstDir.length + 1);
        const src = join(CLAUDE_SRC, sub, rel);
        if (!readFileSync(file).equals(readFileSync(src))) divergent.push(`${sub}/${rel}`);
      }
    }
    expect(divergent).toEqual([]);
  });

  test("3: shipped codex prose carries no bun .claude/tools commands", () => {
    const r = spawnSync(
      "grep",
      ["-rn", "bun .claude/tools/", join(REPO_ROOT, "dist", "codex")],
      { encoding: "utf-8" },
    );
    // grep exits 1 on no matches — exactly what we want.
    expect(r.status).toBe(1);
  });

  test("4: method relocated to workspace-root amadeus/spaces/default/memory/; native rules/ is Starlark-only", () => {
    // The AIDLC method ("memory") no longer ships under .codex/amadeus-rules/ (the
    // old D-10 rename target). It relocated OUT of the harness dir to the
    // workspace root — one hand-editable copy, neutral filenames, identical
    // across harnesses. Reached via AGENTS.md auto-merge + AMADEUS_RULES_DIR.
    const memoryDir = join(REPO_ROOT, "dist", "codex", "amadeus", "spaces", "default", "memory");
    const memoryTop = readdirSync(memoryDir);
    expect(memoryTop).toContain("org.md");
    expect(memoryTop).toContain("team.md");
    expect(memoryTop).toContain("project.md");
    expect(readdirSync(join(memoryDir, "phases"))).toContain("construction.md");
    // .codex/amadeus-rules/ is GONE — the method left the harness dir entirely.
    expect(() => readdirSync(join(CODEX_DST, "amadeus-rules"))).toThrow();
    // .codex/rules/ remains Codex's native Starlark permission-rules dir.
    const nativeRules = readdirSync(join(CODEX_DST, "rules"));
    expect(nativeRules).toEqual(["default.rules"]);
    // The resolver seam re-points at the relocated method (relative to the
    // workspace root, where codex runs), NOT the old .codex/amadeus-rules.
    const config = readFileSync(join(CODEX_DST, "config.toml.example"), "utf-8");
    expect(config).toContain('AMADEUS_RULES_DIR = "amadeus/spaces/default/memory"');
    // The compiled graph's rule display paths are harness-neutral now.
    const graph = readFileSync(join(CODEX_DST, "tools", "data", "stage-graph.json"), "utf-8");
    expect(graph).toContain('"amadeus/spaces/default/memory/org.md"');
    expect(graph).not.toContain(".codex/amadeus-rules/");
    expect(graph).not.toContain('".claude/rules/');
  });

  test("5: hooks.json.example wires only Codex-real events through the adapter (no SessionEnd)", () => {
    const wiring = JSON.parse(readFileSync(join(CODEX_DST, "hooks.json.example"), "utf-8")) as {
      hooks: Record<string, Array<{ matcher?: string; hooks: Array<{ command: string }> }>>;
    };
    expect(Object.keys(wiring.hooks).sort()).toEqual(
      ["PostCompact", "PostToolUse", "PreCompact", "SessionStart", "Stop", "SubagentStop", "UserPromptSubmit"].sort(),
    );
    // Matchers per the verified tool-name map.
    const postMatchers = wiring.hooks.PostToolUse.map((g) => g.matcher).sort();
    expect(postMatchers).toEqual(["Bash", "apply_patch", "update_plan"]);
    // Every registration routes through the single authored adapter.
    for (const groups of Object.values(wiring.hooks)) {
      for (const g of groups) {
        for (const h of g.hooks) {
          expect(h.command).toMatch(/^bun \.codex\/hooks\/amadeus-codex-adapter\.ts [a-z-]+$/);
        }
      }
    }
  });

  test("6: the SHIPPED trust-seed.toml is exactly what emit.ts's trustEntries() produces", () => {
    // The installer pastes the entries in dist/codex/.codex/trust-seed.toml into
    // $CODEX_HOME/config.toml so Codex runs the hooks without a TUI trust pass.
    // The pre-seed is only sound while every shipped hash matches the live hook
    // identity emit.ts hashes. Guard that by calling the REAL exported
    // trustEntries() (not an inlined copy of the recipe) and asserting it
    // reproduces the shipped body verbatim for the <PROJECT_DIR> template. If
    // trustHash's recipe, HOOK_WIRING, or the adapter command ever drifts, the
    // shipped hashes go stale and Codex silently rejects every hook — this fails
    // then, where --check cannot (a buggy emit regenerates the same wrong bytes).
    const { trustEntries } = require(join(REPO_ROOT, "packages", "framework", "harness", "codex", "emit.ts")) as {
      trustEntries: (project: string, hooksJson?: string) => string;
    };
    const shipped = readFileSync(join(CODEX_DST, "trust-seed.toml"), "utf-8");
    // The shipped file is a header comment block + the trustEntries() body. The
    // body begins at the first [hooks.state ...] line.
    const bodyStart = shipped.indexOf("[hooks.state");
    expect(bodyStart).toBeGreaterThan(-1);
    const shippedBody = shipped.slice(bodyStart).trimEnd();
    const produced = trustEntries("<PROJECT_DIR>").trimEnd();
    expect(produced).toBe(shippedBody);
    // And the real session_start hash is a sha256 over the live adapter identity
    // — a concrete anchor so a silent recipe change can't pass by emitting a
    // self-consistent but wrong hash for every entry.
    expect(shippedBody).toContain(
      'session_start:0:0"]\ntrusted_hash = "sha256:aafa51d2b0b0a98e01e2cbceb7814014a75cec3c0e48e5d7bed0b6a3d440981c"',
    );
  });

  test("8: skills tree — every runner carries the S9f implicit-invocation guard; the orchestrator does not", () => {
    const skillsDir = join(REPO_ROOT, "dist", "codex", ".agents", "skills");
    const dirs = readdirSync(skillsDir).filter((d) =>
      statSync(join(skillsDir, d)).isDirectory(),
    );
    // 40 skills: orchestrator + 29 stage runners + init + compose + 4 scope runners + 4 session.
    expect(dirs.length).toBe(40);
    for (const d of dirs) {
      const guard = join(skillsDir, d, "agents", "openai.yaml");
      if (d === "amadeus") {
        // The entry point stays implicitly invocable.
        let exists = true;
        try {
          statSync(guard);
        } catch {
          exists = false;
        }
        expect(exists).toBe(false);
        // The orchestrator ships its question-rendering annex beside SKILL.md.
        expect(readdirSync(join(skillsDir, d)).sort()).toEqual([
          "SKILL.md",
          "question-rendering.md",
        ]);
      } else {
        expect(readFileSync(guard, "utf-8")).toContain("allow_implicit_invocation: false");
      }
    }
    // Stage runners drive the codex tools path (harness interpolation held).
    const probe = readFileSync(join(skillsDir, "amadeus-intent-capture", "SKILL.md"), "utf-8");
    expect(probe).toContain("bun .codex/tools/amadeus-orchestrate.ts next --stage intent-capture --single");
  });

  test("7: trust subcommand substitutes the project path into every entry", () => {
    const r = spawnSync("bun", [PACKAGE_SCRIPT, "codex", "trust", "--project", "/tmp/example-proj"], {
      encoding: "utf-8",
      cwd: REPO_ROOT,
    });
    expect(r.status).toBe(0);
    const entries = r.stdout.match(/\[hooks\.state\."[^"]+"\]/g) ?? [];
    // One entry per registered hook group (8 wirings + the 1 PostCompact = 9).
    const wiring = JSON.parse(readFileSync(join(CODEX_DST, "hooks.json.example"), "utf-8")) as {
      hooks: Record<string, Array<unknown>>;
    };
    const groupCount = Object.values(wiring.hooks).reduce((n, g) => n + g.length, 0);
    expect(entries.length).toBe(groupCount);
    for (const e of entries) {
      expect(e).toContain("/tmp/example-proj/.codex/hooks.json:");
    }
    expect(r.stdout).not.toContain("<PROJECT_DIR>");
  });
});
