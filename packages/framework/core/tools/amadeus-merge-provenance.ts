// amadeus-merge-provenance.ts — CLI entry for C11/FR-9 delegated-merge
// provenance (unit merge-provenance).
//
// Emits "DELEGATED_MERGE_RECORDED" — record-only. The merge itself already
// happened by the time `record` is called (team.md's standing merge-approval
// norm is the sole source of truth for whether the delegation condition —
// required CI green AND pr-convergence converged:true — was actually met;
// this tool takes the caller's word for the evidence and never touches git or
// GitHub). Deliberately its own tool, separate from amadeus-bolt.ts's
// hold-merge/release-merge (Bolt worktree merge-held flag — an unrelated
// mechanism, see business-logic-model.md reality-check).

import {
  type DelegatedMergeEvidence,
  recordDelegatedMerge,
} from "./amadeus-audit.ts";
import { resolveProjectDir } from "./amadeus-lib.ts";
import { initProcessObservability } from "./amadeus-observability.ts";

function flag(args: string[], name: string): string | undefined {
  const idx = args.indexOf(name);
  return idx >= 0 && idx + 1 < args.length ? args[idx + 1] : undefined;
}

function jsonError(message: string): never {
  process.stderr.write(`${JSON.stringify({ error: message })}\n`);
  process.exit(1);
}

function main(): void {
  const args = process.argv.slice(2);
  const projectDir = resolveProjectDir(flag(args, "--project-dir"));

  // Telemetry process span (opt-in). initProcessObservability is fail-soft by
  // construction: config resolution falls back to DISABLED internally, so no
  // catch is needed here (and the no-silent-drop gate forbids one).
  initProcessObservability("tool:amadeus-merge-provenance:record", projectDir);

  if (args[0] !== "record") {
    jsonError(
      "Usage: amadeus-merge-provenance record --standing-ruling-ref <cid> --ci-conclusion <result> --converged-digest <ref> [--project-dir <path>] [--intent <dir>] [--space <name>]"
    );
  }

  const evidence: DelegatedMergeEvidence = {
    standingRulingRef: flag(args, "--standing-ruling-ref") ?? "",
    ciConclusion: flag(args, "--ci-conclusion") ?? "",
    convergedDigest: flag(args, "--converged-digest") ?? "",
  };

  const result = recordDelegatedMerge(
    evidence,
    projectDir,
    flag(args, "--intent"),
    flag(args, "--space")
  );

  if (!result.ok) {
    jsonError(`record-delegated-merge refused: ${JSON.stringify(result.error)}`);
  }
  process.stdout.write(`${JSON.stringify(result.receipt)}\n`);
}

if (import.meta.main) {
  main();
}
