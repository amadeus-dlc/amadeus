// harness/claude/manifest.ts — the Claude Code distribution row.
//
// One core, N harnesses (dist-unified). This manifest tells scripts/package.ts
// how to project the harness-neutral core/ tree into dist/claude/.claude/:
//   - the harness directory token substitution ({{HARNESS_DIR}} → .claude)
//   - the per-dir map (core/<src> → <harnessDir>/<dst>); Claude renames nothing
//   - which authored files live in harness/claude/ and where they land
//   - authored-file exemptions for the packager's orphan scan (none for Claude —
//     dist/claude is 100% core + harness-copied + generated)
//
// Claude is a peer harness, not the identity transform: its prose carries the
// same {{HARNESS_DIR}} token as every other harness; the packager substitutes
// `.claude` here. Because that substitution restores exactly today's `.claude/`
// literals, the regenerated dist/claude is byte-identical to the hand-authored
// tree it replaces (the MR-1 keystone gate).

import type { HarnessManifest } from "../../../../scripts/manifest-types.ts";
import { mirrorCoreSkillDirectory } from "../projections.ts";
import onboardingFills from "./onboarding.fills.ts";

export { PROJECT_INSTRUCTIONS } from "./project-instructions.ts";

interface HookSpec {
  path: string;
}

// The canonical shape of a Claude hook launch line. `:-.` is load-bearing:
// Claude Code does not always export CLAUDE_PROJECT_DIR (a worktree session
// launched outside the project root leaves it unset), and a bare
// `bun $CLAUDE_PROJECT_DIR/...` then expands to an absolute-looking
// `/.claude/hooks/...` and the hook never runs at all — silently, since a hook
// that fails to launch produces no output anywhere (issue #1492). Defaulting to
// `.` runs the hook relative to the session cwd instead; the script's own
// project-dir ladder takes it from there.
export function renderClaudeHookCommand(
  projectDirVariable: "CLAUDE_PROJECT_DIR",
  hook: HookSpec,
): string {
  return `bun "\${${projectDirVariable}:-.}/${hook.path}"`;
}

const manifest: HarnessManifest = {
  name: "claude",
  mirrorSurface: "claude",
  harnessDir: ".claude",
  stageEntry: { kind: "runner", root: ".claude/skills" },

  // core/<src> → <harnessDir>/<dst>. Claude keeps every core dir name as-is.
  // The method ("memory") is NO LONGER a core dir projected into the harness
  // tree — it relocated to the workspace-root amadeus/spaces/default/memory/ (one
  // hand-editable copy, emitted by the packager's memory step), read by Claude
  // via the .claude/rules/amadeus.md @-stub (a harnessFile). The rulesRename
  // machinery (steering/amadeus-rules) still rewrites the <harness>/rules/ prose
  // mentions other core files carry, so it stays.
  coreDirs: [
    { src: "tools", dst: "tools" },
    // U1 (otel-walking-skeleton, FR-DST-2): the OTel provider layer and the
    // vendored OTel API ship to every harness (FR-DST-1 bundle incorporation).
    { src: "otel", dst: "otel" },
    { src: "vendor", dst: "vendor" },
    { src: "amadeus-common", dst: "amadeus-common" },
    { src: "knowledge", dst: "knowledge" },
    { src: "sensors", dst: "sensors" },
    { src: "scopes", dst: "scopes" },
    { src: "agents", dst: "agents" },
    { src: "hooks", dst: "hooks" },
    // The harness-neutral session skills ship in-tree under skills/.
    { src: "skills/amadeus-session-cost", dst: "skills/amadeus-session-cost" },
    { src: "skills/amadeus-replay", dst: "skills/amadeus-replay" },
    { src: "skills/amadeus-outcomes-pack", dst: "skills/amadeus-outcomes-pack" },
    { src: "skills/amadeus-grilling", dst: "skills/amadeus-grilling" },
    mirrorCoreSkillDirectory("claude"),
    { src: "skills/amadeus-election", dst: "skills/amadeus-election" },
    { src: "skills/amadeus-plugin", dst: "skills/amadeus-plugin" },
  ],

  // Authored harness surfaces copied verbatim (with token substitution on .md)
  // from harness/claude/<src> → <harnessDir>/<dst>.
  harnessFiles: [
    { src: "skills/amadeus/SKILL.md", dst: "skills/amadeus/SKILL.md" },
    { src: "skills/amadeus/question-rendering.md", dst: "skills/amadeus/question-rendering.md" },
    { src: "skills/amadeus/issue-ref-contract.md", dst: "skills/amadeus/issue-ref-contract.md" },
    // The AIDLC method @-import stub: .claude/rules/amadeus.md pulls the relocated
    // method (amadeus/spaces/default/memory/*) into Claude's ambient context by
    // reference (explicit @-imports, no copy). The rules/ dir is no longer a
    // core projection — this stub is the only file in it.
    { src: "rules-amadeus.md", dst: "rules/amadeus.md" },
    { src: "hooks/amadeus-dispatch.ts", dst: "hooks/amadeus-dispatch.ts" },
    { src: "settings.json.example", dst: "settings.json.example" },
    { src: "settings.local.json.example", dst: "settings.local.json.example" },
    // Project-root install files (beside .claude/, not inside it). A user copies
    // `dist/claude/` wholesale, so these ship at the dist root. Authored here
    // (not core/) because they are Claude-Code-specific; dot-gitignore is the
    // authored name so it does not act as a live ignore inside harness/claude/.
    { src: "dot-gitignore", dst: ".gitignore", projectRoot: true },
  ],

  // Reviewers receive evidence through the conductor and may only inspect the
  // authoritative paths passed to them. The real Claude `tools:` field narrows
  // both built-ins and inherited MCP tools; `allowedTools:` is not recognized.
  frontmatterAdditions: [
    { file: "agents/amadeus-product-lead-agent.md", lines: ["tools: [Read, Grep, Glob]"] },
    { file: "agents/amadeus-architecture-reviewer-agent.md", lines: ["tools: [Read, Grep, Glob]"] },
  ],

  // CLAUDE.md renders from the shared skeleton core/templates/onboarding.md with
  // Claude's fills, then the standard {{HARNESS_DIR}} → .claude transform. It
  // lands at the project root (outside .claude/), exactly like every AGENTS.md
  // harness: Claude Code auto-loads a root CLAUDE.md, so the doc ships as the
  // real file rather than a .example the user has to copy by hand (#3388). The
  // installer's destination ladder is what keeps that no-clobber — an existing
  // CLAUDE.md diverts the install to CLAUDE-AMADEUS.md plus wiring guidance.
  onboarding: { dst: "CLAUDE.md", projectRoot: true, fills: onboardingFills },

  // Claude renames no core dir.
  rulesRename: null,

  // The Claude tree carries no authored-in-place files inside generated dirs and
  // no per-harness emissions — dist/claude is core + harness copies + generated
  // runners + compiled graph JSON. Nothing is exempt from the orphan scan.
  authoredExempt: [],

  // No emit() plugin: Claude's runners come from the shared runner-gen
  // composition and its compiled data from graph compile, both driven by the
  // packager. (Codex is the only harness that ships an emit.ts today.)
  emit: null,
};

export default manifest;
