// covers: conductor-skill:per-harness-freshness
//
// t181 — PER-HARNESS CONDUCTOR-SKILL FRESHNESS GATE. Mechanism: none
// (readFileSync over harness/*/skills/amadeus/SKILL.md, zero spawn, zero LLM, zero
// tokens). Technique: deterministic closed predicate, harness list derived FROM
// DISK (mirrors t156 §7's readdirSync+filter+floor idiom — never a hardcoded
// [claude,kiro,codex] triple, so a NEW harness tree is auto-covered).
//
// WHY THIS EXISTS (the P11 "RESOLVE (2)" obligation): the workspace refactor
// (per-intent layout, --init retirement, intent/space verbs, multi-repo --repo,
// the "offer a second intent" conductor prose) updated every authored conductor
// SKILL — EXCEPT harness/kiro-ide/skills/amadeus/SKILL.md, which was a stale fork
// byte-identical to kiro CLI's SKILL at origin/v2 and never re-synced across the
// 43-commit stack. It shipped GREEN because NO test reads a per-harness conductor
// SKILL: `package.ts --check` only proves dist==authored, so a self-consistent-
// but-stale authored SKILL passes. This gate closes that hole in BOTH directions:
//   (a) NEGATIVE — the retired `/amadeus --init` command (a bare `--init` flag
//       token; `git init`/`npm init` are NOT the amadeus command, same predicate as
//       t174) must be ABSENT from every shipped conductor SKILL.
//   (b) POSITIVE — shared workspace-routing and run-stage output semantics must
//       be PRESENT in every shipped conductor SKILL. Catches a future fork that
//       drops `--init` yet still lacks the current conductor contract.
//
// Six harnesses author SKILL.md; Cursor and OpenCode author commands/amadeus.md.
// Together these eight conductor surfaces define the complete shipped routing
// contract. Dist is their byte-parity-guarded projection (t148/package.ts
// --check), so gating the authored source covers every tree.

import { describe, expect, test } from "bun:test";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { REPO_ROOT } from "../harness/fixtures.ts";

const HARNESS_DIR = join(REPO_ROOT, "packages", "framework", "harness");

/** Authored conductor SKILLs, repo-root-relative (posix), derived FROM DISK:
 *  every harness/<h>/ that ships skills/amadeus/SKILL.md. Disk-derivation (not a
 *  hardcoded list) means a newly-added harness tree is covered automatically and
 *  cannot escape the gate by being absent from a static triple. */
function harnessSkills(): string[] {
  return readdirSync(HARNESS_DIR)
    .filter((h) => existsSync(join(HARNESS_DIR, h, "skills", "amadeus", "SKILL.md")))
    .map((h) => `packages/framework/harness/${h}/skills/amadeus/SKILL.md`)
    .sort();
}

/** Every authored conductor surface. Skill-native harnesses use SKILL.md;
 * command-native harnesses use commands/amadeus.md. */
function conductorSurfaces(): string[] {
  return readdirSync(HARNESS_DIR)
    .flatMap((h) => {
      const candidates = [
        `packages/framework/harness/${h}/skills/amadeus/SKILL.md`,
        `packages/framework/harness/${h}/commands/amadeus.md`,
      ];
      return candidates.filter((rel) => existsSync(join(REPO_ROOT, rel)));
    })
    .sort();
}

function preparedRetryBlock(body: string): string | null {
  const lines = body.split("\n");
  const anchor = lines.findIndex((line) => line.includes("prepared_batch"));
  if (anchor < 0) return null;
  let start = anchor;
  while (
    start > 0 &&
    lines[start - 1].trim().length > 0 &&
    !/^#{1,6}\s/.test(lines[start - 1]) &&
    !/^\s*-\s/.test(lines[start])
  ) start--;
  let end = anchor;
  while (
    end + 1 < lines.length &&
    lines[end + 1].trim().length > 0 &&
    !/^#{1,6}\s/.test(lines[end + 1]) &&
    !/^\s*-\s/.test(lines[end + 1])
  ) end++;
  return lines.slice(start, end + 1).map((line) => line.trim()).join(" ");
}

function sectionStartingAt(body: string, heading: string): string {
  const start = body.indexOf(heading);
  if (start < 0) return "";
  const headingMarkers = heading.startsWith("### ") ? ["\n### ", "\n## "] : ["\n## "];
  const candidates = headingMarkers
    .map((marker) => body.indexOf(marker, start + heading.length))
    .filter((index) => index >= 0);
  const next = candidates.length > 0 ? Math.min(...candidates) : -1;
  return body.slice(start, next < 0 ? undefined : next);
}

function invokeSwarmDispatchScope(body: string): string {
  const tableRow = body
    .split("\n")
    .find((line) => line.startsWith("| `invoke-swarm` |"));
  return [
    tableRow ?? "",
    sectionStartingAt(body, "### Harness-neutral fixed Unit pool"),
    sectionStartingAt(body, "## Construction swarm on Pi"),
  ].join("\n");
}

// A bare `--init` flag token: `--init` not preceded by another flag char — the
// retired amadeus command. NOT `git init`/`npm init` (no leading hyphen). Same
// predicate as t174's `--init` scan.
const BARE_INIT = /(^|[^-\w])--init\b/;

// The shared conductor vocabulary every shipped SKILL must define.
const REQUIRED_TOKENS = [
  "intent-birth", // run-then-continue birth verb (replaced `init`)
  "--repo", // multi-repo swarm prepare flag
  "offer a second intent", // P4-completion new-work conductor prose
  "intent and space verbs", // frontmatter utilities tail
  "required output paths are mandatory", // produces candidates: required half
  "optional output paths are candidates", // produces candidates: conditional half
  "Pass only artifact paths that exist", // reviewers never read omitted optionals
  // Three-value swarm-driver dispatch (swarm-dispatch-enum / #1157): every shipped
  // conductor SKILL must resolve the driver via the referee's `resolve` subcommand
  // and name both native-ultra values, so a stale binary-era fork (AMADEUS_USE_SWARM=1
  // / `ultracode`) trips. These three are genuinely common to all four trees: each
  // SKILL runs `resolve --harness <self>` and describes both the ultra it dispatches
  // and the ultra it degrades. The codex-only c2 dispatch discipline is asserted
  // separately below (it must NOT be forced onto claude/kiro's unchanged prose).
  "resolve --harness", // driver resolution runs before any prepare/spawn
  "claude-ultra", // native-ultra vocabulary (selected on claude, degraded elsewhere)
  "codex-ultra", // native-ultra vocabulary (selected on codex, degraded elsewhere)
];

// The Codex conductor SKILL is the ONLY harness that authors new spawn prose in
// this intent (native subagent fan-out), so it — and only it — must burn in the
// c2 worktree-isolation discipline every child task inherits. Kept out of the
// shared REQUIRED_TOKENS set on purpose: claude/kiro dispatch prose is unchanged
// (their fan-out already reads "in its worktree"), and forcing this token onto
// them would demand edits SNR-W3 explicitly scopes out.
const CODEX_SKILL = "packages/framework/harness/codex/skills/amadeus/SKILL.md";
const CODEX_C2_TOKEN = "worktree-relative paths only";
const SHARED_BUILDER_ROUTING_TOKENS = [
  "Delegated implementation outside a named lifecycle stage",
  "uses `amadeus-builder-agent`",
  "Named `reverse-engineering` and `code-generation` lifecycle stages remain owned by `amadeus-developer-agent`.",
] as const;
// Issue #2837. The swarm dispatch context splits in two, and every shipped
// surface must carry BOTH halves:
//   - the batch identity is ENGINE-owned routing the conductor may not
//     re-derive, so the surface transcribes `directive.batch` instead of asking
//     for a hand-typed `--batch <n>` (a guessed number silently correlates with
//     whatever pool already owns it — `prepare` only checks it is an integer);
//   - the convergence check is CONDUCTOR knowledge the engine never supplies,
//     so the surface names where that knowledge legitimately comes from rather
//     than leaving `--check-cmd` sourceless.
const SWARM_CONTEXT_TOKENS = [
  "directive.batch",
  "the convergence check is conductor knowledge",
  "amadeus/spaces/<space>/memory/",
] as const;
const HAND_TYPED_BATCH = "--batch <n>";
const REVIEW_RECOVERY_TOKENS = [
  "`review_only:true`",
  "skips the stage body",
  "`gate:false` suppresses only the human gate and §13",
] as const;
const SWARM_SOURCE_HANDOFF_TOKENS = [
  "source-only Git commit",
  "only implementation and test changes",
  "`amadeus/` state, audit, runtime",
  "same `--repo <name>`",
  "finalize --batch <directive.batch>",
  "[--target <branch>]",
  "[--strategy <squash|merge|rebase>]",
  "non-default `--base <branch>`",
  "same branch explicitly as `finalize --target <branch>`",
  "workflow metadata first",
  "target `main`",
  "strategy `squash`",
  "source merge fails",
  "`halt-and-ask`",
] as const;
const BUILDER_AGENT = "packages/framework/core/agents/amadeus-builder-agent.md";
const BUILDER_SOURCE_HANDOFF_TOKENS = [
  "after the assigned verification succeeds and before reporting success",
  "source-only Git commit",
  "assigned worktree",
  "only implementation and test changes",
  "`amadeus/` state, audit, runtime",
  "Never stage or commit",
] as const;
const BRANCHING_STRATEGIES_KNOWLEDGE =
  "packages/framework/core/knowledge/amadeus-pipeline-deploy-agent/branching-strategies.md";
const RETIRED_SOURCE_DISPATCH_CLAIMS = [
  "does not call amadeus-worktree merge directly",
  "No shipped conductor face carries",
  "dispatch lives in SKILL",
  "Step 6.5",
] as const;
const CURRENT_SOURCE_DISPATCH_TOKENS = [
  "`amadeus-swarm finalize`",
  "source merge dispatch is not conductor prose",
  "reconciles workflow metadata first",
  "invokes `amadeus-worktree merge` as a primitive",
] as const;

describe("t181 per-harness conductor-surface freshness gate (P11 RESOLVE-2)", () => {
  const skills = harnessSkills();

  test("the disk-derived harness-SKILL set covers every shipped tree (no vacuous pass)", () => {
    // Floor guard (mirrors t156 §7): if the dir-detection silently matched zero
    // trees the positive/negative scans below would vacuously pass. Pin the
    // known four so a regression that hides a tree (or empties harness/) trips.
    expect(skills).toEqual([
      "packages/framework/harness/claude/skills/amadeus/SKILL.md",
      "packages/framework/harness/codex/skills/amadeus/SKILL.md",
      "packages/framework/harness/kimi/skills/amadeus/SKILL.md",
      "packages/framework/harness/kiro-ide/skills/amadeus/SKILL.md",
      "packages/framework/harness/kiro/skills/amadeus/SKILL.md",
      "packages/framework/harness/pi/skills/amadeus/SKILL.md",
    ]);
  });

  test("no shipped conductor SKILL carries the retired `--init` command", () => {
    const offenders: string[] = [];
    for (const rel of skills) {
      const lines = readFileSync(join(REPO_ROOT, rel), "utf-8").split("\n");
      for (let i = 0; i < lines.length; i++) {
        if (BARE_INIT.test(lines[i])) {
          offenders.push(`${rel}:${i + 1}  ${lines[i].trim()}`);
        }
      }
    }
    // Surface the exact stale line so a fix is a one-line diff (rewrite to the
    // workspace model). A bare `--init` is a genuine bug, never allowlisted.
    expect(offenders).toEqual([]);
  });

  test("every shipped conductor SKILL carries the workspace-anchor vocabulary", () => {
    const missing: string[] = [];
    for (const rel of skills) {
      const body = readFileSync(join(REPO_ROOT, rel), "utf-8");
      for (const tok of REQUIRED_TOKENS) {
        if (!body.includes(tok)) missing.push(`${rel}  missing: ${tok}`);
      }
    }
    expect(missing).toEqual([]);
  });

  test("every harness distinguishes prepared retries from ordinary swarm preparation", () => {
    const missing: string[] = [];
    for (const rel of skills) {
      const body = readFileSync(join(REPO_ROOT, rel), "utf-8");
      const scope = preparedRetryBlock(body);
      if (scope === null) {
        missing.push(`${rel}  prepared retry missing: prepared_batch`);
        continue;
      }
      for (const token of ["retry_unit", "acquire", "confirm"]) {
        if (!scope.includes(token)) missing.push(`${rel}  prepared retry missing: ${token}`);
      }
      if (!/(?:skip|do not).*(?:driver resolution|resolve the driver)/i.test(scope)) {
        missing.push(`${rel}  prepared retry does not skip driver resolution`);
      }
      if (!/(?:skip|do not run).*(?:ordinary|normal|run )?prepar/i.test(scope)) {
        missing.push(`${rel}  prepared retry does not skip preparation`);
      }
    }
    expect(missing).toEqual([]);
  });

  test("every conductor surface transcribes the batch identity and names the check-command source", () => {
    const surfaces = conductorSurfaces();
    expect(surfaces).toHaveLength(8);
    const missing: string[] = [];
    for (const rel of surfaces) {
      const body = readFileSync(join(REPO_ROOT, rel), "utf-8");
      for (const token of SWARM_CONTEXT_TOKENS) {
        if (!body.includes(token)) missing.push(`${rel}  missing: ${token}`);
      }
      if (body.includes(HAND_TYPED_BATCH)) {
        missing.push(`${rel}  still hand-types ${HAND_TYPED_BATCH}`);
      }
    }
    expect(missing).toEqual([]);
  });

  test("every conductor surface preserves the worker source-integration handoff", () => {
    const surfaces = conductorSurfaces();
    expect(surfaces).toHaveLength(8);
    const missing: string[] = [];
    for (const rel of surfaces) {
      const body = readFileSync(join(REPO_ROOT, rel), "utf-8");
      const swarmScope = invokeSwarmDispatchScope(body);
      for (const token of SWARM_SOURCE_HANDOFF_TOKENS) {
        if (!swarmScope.includes(token)) missing.push(`${rel}  swarm handoff missing: ${token}`);
      }
    }
    expect(missing).toEqual([]);
  });

  test("the shared builder contract requires a verified source-only swarm commit", () => {
    const body = readFileSync(join(REPO_ROOT, BUILDER_AGENT), "utf-8");
    const missing = BUILDER_SOURCE_HANDOFF_TOKENS.filter((token) => !body.includes(token));
    expect(missing).toEqual([]);
  });

  test("branching knowledge describes referee-owned metadata-first source integration", () => {
    const body = readFileSync(join(REPO_ROOT, BRANCHING_STRATEGIES_KNOWLEDGE), "utf-8");
    const prose = body.replaceAll("`", "");
    const retired = RETIRED_SOURCE_DISPATCH_CLAIMS.filter((claim) => prose.includes(claim));
    const missing = CURRENT_SOURCE_DISPATCH_TOKENS.filter((token) => !body.includes(token));
    expect(retired).toEqual([]);
    expect(missing).toEqual([]);
  });

  test("every conductor surface preserves per-unit review before gate recovery", () => {
    const missing: string[] = [];
    for (const rel of conductorSurfaces()) {
      const body = readFileSync(join(REPO_ROOT, rel), "utf-8");
      for (const token of REVIEW_RECOVERY_TOKENS) {
        if (!body.includes(token)) missing.push(`${rel}  missing: ${token}`);
      }
    }
    expect(missing).toEqual([]);
  });

  test("the Codex conductor SKILL burns the c2 worktree-isolation discipline into its native fan-out prose", () => {
    // BR-W6(i) / SNR-W3: the one new spawn prose in this intent (codex native
    // fan-out) must carry the c2 discipline verbatim so every child task inherits
    // it — the primary defence against cross-worktree writes. Scoped to codex on
    // purpose; the shared set above stays common to all four trees.
    const body = readFileSync(join(REPO_ROOT, CODEX_SKILL), "utf-8");
    expect(body.includes(CODEX_C2_TOKEN)).toBe(true);
  });

  test("every harness routes bounded implementation to builder while preserving developer-owned stages", () => {
    const surfaces = conductorSurfaces();
    expect(surfaces).toHaveLength(8);
    const missing: string[] = [];
    for (const rel of surfaces) {
      const body = readFileSync(join(REPO_ROOT, rel), "utf-8");
      for (const token of SHARED_BUILDER_ROUTING_TOKENS) {
        if (!body.includes(token)) missing.push(`${rel}  missing: ${token}`);
      }
      const swarmScope = invokeSwarmDispatchScope(body);
      if (!swarmScope.includes("amadeus-builder-agent")) {
        missing.push(`${rel}  invoke-swarm missing builder dispatch`);
      }
      if (swarmScope.includes("amadeus-developer-agent")) {
        missing.push(`${rel}  invoke-swarm incorrectly dispatches developer`);
      }
    }
    expect(missing).toEqual([]);
  });

  test("named implementation lifecycle stages remain developer-owned in the projected core", () => {
    for (const rel of [
      "packages/framework/core/amadeus-common/stages/inception/reverse-engineering.md",
      "packages/framework/core/amadeus-common/stages/construction/code-generation.md",
    ]) {
      const body = readFileSync(join(REPO_ROOT, rel), "utf-8");
      expect(body).toContain("lead_agent: amadeus-developer-agent");
    }
  });

  test("Kiro harnesses expose builder as a trusted native subagent", () => {
    for (const harness of ["kiro", "kiro-ide"]) {
      const root = join(REPO_ROOT, "packages", "framework", "harness", harness);
      const builder = JSON.parse(readFileSync(join(root, "agents", "amadeus-builder-agent.json"), "utf-8"));
      const conductor = JSON.parse(readFileSync(join(root, "agents", "amadeus.json"), "utf-8"));
      expect(builder.name).toBe("amadeus-builder-agent");
      expect(builder.description).toContain("swarm units");
      expect(builder.resources).toContain("file://.kiro/knowledge/amadeus-builder-agent/*.md");
      expect(conductor.toolsSettings.subagent.trustedAgents).toContain("amadeus-builder-agent");
    }
  });
});
