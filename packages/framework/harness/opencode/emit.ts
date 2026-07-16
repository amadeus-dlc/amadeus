// harness/opencode/emit.ts — the OpenCode CLI per-shell emission plugin.
//
// The unified packager copies core/ → dist/opencode/.opencode/ (rules →
// amadeus-rules) and runs graph compile, then calls this emit() for the
// opencode-specific surfaces that no declarative manifest row can express:
//   - the projectRoot AGENTS.md session guide (.md token-substitution path),
//   - the .opencode/commands/amadeus.md orchestrator-forwarding command
//     (Bolt 1 skeleton, authored prose, verbatim),
//   - opencode.json.example (a permission-narrowing config example), and
//   - the four harness-neutral SESSION skills composed into .opencode/skills/
//     from core/skills/ (amadeus-session-cost / amadeus-replay /
//     amadeus-outcomes-pack / amadeus-grilling).
// OpenCode discovers user commands at .opencode/commands/ and skills at
// .opencode/skills/, so the manifest sets skipRunnerGen and emit owns both.
// The orchestrator ships ONLY as the command (Bolt 1); it is NOT re-composed
// as a skill (E-OC16 ruling C — avoid dist duplication; core has no
// orchestrator skill origin, only the four session skills).
//
// The command body is AUTHORED prose (harness/opencode/commands/amadeus.md), read
// through ctx.readHarnessSource so it counts as a referenced source in the
// packager's unreferenced-source scan (#735). It is opencode-specific prose with
// literal .opencode paths, so no token substitution is applied to it. AGENTS.md
// and the session skills DO carry {{HARNESS_DIR}} tokens and go through the .md
// token-substitution path (ctx.substituteToken), mirroring the packager's core
// transform.
//
// Error policy: FAIL-FAST — I/O failures (readFileSync / writeFileSync) propagate
// as thrown errors rather than being swallowed, and the check branch reports
// MISSING/DIFFERS via the returned EmitResult.problems. Semantically matched to
// the citation source codex emit.ts:348-367 (same throw-on-write, collect-on-check
// shape); no error is smoothed over here.

import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import type { EmitContext, EmitResult } from "../../../../scripts/manifest-types.ts";

// The four harness-neutral session skills (core/skills/<name>/). They carry
// {{HARNESS_DIR}} tokens and ship as SKILL.md only — no codex openai.yaml
// implicit-invocation guard (that is an OpenAI/Codex agent-discovery artifact;
// OpenCode has no equivalent, so the guard is dropped, matching how Claude ships
// these same skills as bare SKILL.md trees).
const SESSION_SKILLS = ["amadeus-session-cost", "amadeus-replay", "amadeus-outcomes-pack", "amadeus-grilling"];

// The opencode.json config EXAMPLE. OpenCode defaults most permissions to
// "allow" (permissive); this example shows the NARROWING direction only —
// edit/bash/webfetch moved allow → ask so nothing auto-runs without approval.
// No relaxation (allow) rules are shown by design. JSON is strict (no comments);
// the rationale lives in AGENTS.md. $schema points at OpenCode's published
// config schema so editors validate the file.
function emitOpencodeJsonExample(): string {
  return (
    JSON.stringify(
      {
        $schema: "https://opencode.ai/config.json",
        permission: {
          edit: "ask",
          bash: "ask",
          webfetch: "ask",
        },
      },
      null,
      2,
    ) + "\n"
  );
}

// The projectRoot AGENTS.md — a FOCUSED opencode session guide (not the shared
// onboarding skeleton render). Cites codex emit.ts:237-248 (emitAgentsMd) as the
// style source; error policy is semantically identical (fail-fast throw-on-write,
// no swallow). Carries {{HARNESS_DIR}} tokens resolved by rewriteProse (token
// substitution + the amadeus-rules rename).
function emitAgentsMd(rewriteProse: (s: string) => string): string {
  const body = `# AI-DLC on OpenCode

This project runs AI-DLC (AI-Driven Development Life Cycle) under the OpenCode
harness. The deterministic engine, state machine, audit log, and referee are
byte-identical to every other harness distribution; only the shell differs.

## Starting a workflow

Invoke the orchestrator with the \`$amadeus\` command (authored at
\`{{HARNESS_DIR}}/commands/amadeus.md\`) followed by a scope or a description of
what to build. It runs a deterministic forwarding loop: ask the engine what to
do next, do that one thing, report the outcome, repeat until the workflow is
done. Utility invocations pass through to the same engine —
\`$amadeus --status\` for progress, \`$amadeus --doctor\` to validate setup,
\`$amadeus --version\` for the framework version, and
\`$amadeus --stage <slug>\` / \`--phase <name>\` / \`--depth <level>\` for the
usual overrides.

## Session resumption

On startup, resolve the active intent (the
\`amadeus/spaces/<space>/intents/active-intent\` cursor) and check for its
\`<record>/amadeus-state.md\`. If found, load the prior context and offer to
resume from the last checkpoint. A brand-new workspace has no intent yet — the
engine auto-births the first one on your first \`$amadeus\`.

## The AI-DLC method is canonical

The layered practice files — \`org.md\`, \`team.md\`, \`project.md\`, and the
per-phase \`phases/<phase>.md\` — are the canonical AI-DLC governance for every
stage. They are authored ONCE at the workspace root under
\`amadeus/spaces/<space>/memory/\` (the single hand-editable source of truth,
identical on every harness) and are the rules this harness reads under the
\`{{HARNESS_DIR}}/amadeus-rules/\` name (the harness's markdown rule layers,
kept separate from any native tool config). Resolution is a strict-additive
chain — \`org → team → project → phase → stage\`. Edit the method at the
workspace root, never a per-harness copy.

## Permissions

OpenCode defaults most permissions to \`allow\`. The shipped
\`opencode.json.example\` is a NARROWING starting point — it sets
\`edit\`/\`bash\`/\`webfetch\` to \`ask\` so nothing runs without approval. Copy
it to \`opencode.json\` and tighten or grant per your team's posture; the
deterministic core runs via \`bun {{HARNESS_DIR}}/tools/…\` and
\`bun {{HARNESS_DIR}}/hooks/…\`, which you can allow explicitly once you trust
the tree.
`;
  return rewriteProse(body);
}

// Recursively list the files under a dir (sorted), so a multi-file session skill
// ships every file. Session skills are single SKILL.md today, but the walk keeps
// the composition faithful to codex's shape (codex emit.ts:281-289) if one grows.
function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir).sort()) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

// ---------------------------------------------------------------------------
// emit() — the manifest entry point. Assembles the opencode emissions as a
// {path, content} list, then writes (or, under check, diffs) them. Preserves the
// skeleton's write⇔check symmetric shape (Bolt 1); this Bolt only ADDS entries.
// ---------------------------------------------------------------------------
export default function emit(ctx: EmitContext): EmitResult {
  const { coreRoot, distRoot, harnessDir, substituteToken } = ctx;
  const DOPENCODE = join(distRoot, ".opencode"); // dist/opencode/.opencode

  // The opencode .md transform: token substitution ({{HARNESS_DIR}} → .opencode)
  // THEN the rules-dir rename (rulesRename: "amadeus-rules"), matching how the
  // packager's transform() treats every core .md and mirroring codex emit's
  // rewriteProse (codex emit.ts:226-227). No-op on prose that already names
  // amadeus-rules/, so it never doubles the segment.
  const rewriteProse = (s: string): string =>
    substituteToken(s).replaceAll(`${harnessDir}/rules/`, `${harnessDir}/amadeus-rules/`);

  // Emission table. The orchestrator-forwarding command (Bolt 1, verbatim) plus
  // the Bolt 2 surfaces: AGENTS.md, opencode.json.example, and the four session
  // skills. Nothing here composes an orchestrator SKILL — it lives only as the
  // command (E-OC16 ruling C).
  const emissions: Array<{ path: string; content: () => string }> = [
    {
      path: join(DOPENCODE, "commands", "amadeus.md"),
      content: () => ctx.readHarnessSource(join("commands", "amadeus.md")),
    },
    {
      path: join(distRoot, "AGENTS.md"),
      content: () => emitAgentsMd(rewriteProse),
    },
    {
      path: join(DOPENCODE, "opencode.json.example"),
      content: emitOpencodeJsonExample,
    },
  ];

  // Session skills: byte-copy each core/skills/<skill>/ file with the .md
  // transform (rewriteProse), landing under .opencode/skills/<skill>/. Mirrors
  // codex emit.ts:337-346 (the (d) session-skills clause) — destination differs
  // (.opencode/skills/ vs .agents/skills/), and no openai.yaml guard is emitted.
  for (const skill of SESSION_SKILLS) {
    const srcDir = join(coreRoot, "skills", skill);
    for (const file of walk(srcDir)) {
      const rel = relative(srcDir, file);
      emissions.push({
        path: join(DOPENCODE, "skills", skill, rel),
        content: () => rewriteProse(readFileSync(file, "utf-8")),
      });
    }
  }

  // --- write or check --------------------------------------------------------
  const written: string[] = [];
  const problems: string[] = [];
  if (ctx.check) {
    for (const { path, content } of emissions) {
      const want = content();
      if (!existsSync(path)) problems.push(`MISSING emission: ${relative(distRoot, path)}`);
      else if (readFileSync(path, "utf-8") !== want) problems.push(`DIFFERS emission: ${relative(distRoot, path)}`);
      written.push(path);
    }
  } else {
    for (const { path, content } of emissions) {
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, content(), "utf-8");
      written.push(path);
    }
  }
  return { written, problems };
}
