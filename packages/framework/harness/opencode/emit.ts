// harness/opencode/emit.ts — the OpenCode CLI per-shell emission plugin (skeleton).
//
// The unified packager copies core/ → dist/opencode/.opencode/ (rules →
// amadeus-rules) and runs graph compile, then calls this emit() for the ONE
// opencode-specific surface: the .opencode/commands/amadeus.md orchestrator-
// forwarding command. OpenCode discovers user commands at .opencode/commands/,
// so the manifest sets skipRunnerGen and emit writes the command here (the
// single skeleton entry — config, agents, and the full skill set are later Bolts).
//
// The command body is AUTHORED prose (harness/opencode/commands/amadeus.md), read
// through ctx.readHarnessSource so it counts as a referenced source in the
// packager's unreferenced-source scan (#735). It is opencode-specific prose with
// literal .opencode paths, so no token substitution is applied.
//
// Error policy: FAIL-FAST — I/O failures (readFileSync / writeFileSync) propagate
// as thrown errors rather than being swallowed, and the check branch reports
// MISSING/DIFFERS via the returned EmitResult.problems. Semantically matched to
// the citation source codex emit.ts:348-367 (same throw-on-write, collect-on-check
// shape); no error is smoothed over here.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import type { EmitContext, EmitResult } from "../../../../scripts/manifest-types.ts";

// ---------------------------------------------------------------------------
// emit() — the manifest entry point. Assembles the single opencode emission as a
// {path, content} entry, then writes (or, under check, diffs) it. Mirrors the
// codex emit() write⇔check symmetry (codex emit.ts:348-367) reduced to one row.
// ---------------------------------------------------------------------------
export default function emit(ctx: EmitContext): EmitResult {
  const { distRoot } = ctx;
  const DOPENCODE = join(distRoot, ".opencode"); // dist/opencode/.opencode

  // Emission table: exactly ONE entry for the skeleton — the orchestrator-
  // forwarding command, verbatim from the authored source.
  const emissions: Array<{ path: string; content: () => string }> = [
    {
      path: join(DOPENCODE, "commands", "amadeus.md"),
      content: () => ctx.readHarnessSource(join("commands", "amadeus.md")),
    },
  ];

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
