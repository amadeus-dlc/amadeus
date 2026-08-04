import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

type BaselineEnvelope = {
  readonly generatedFrom?: { readonly previousDigest?: unknown };
};

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/** Resolve the ancestor whose baseline bytes are bound by the current shrink-only ledger. */
export function noSilentDropTrustedBase(repoRoot: string): string | null {
  const baseline: unknown = JSON.parse(
    readFileSync(join(repoRoot, "tests", "no-silent-drop", "baseline.json"), "utf8"),
  );
  if (typeof baseline !== "object" || baseline === null || Array.isArray(baseline)) return null;
  const generatedFrom = (baseline as BaselineEnvelope).generatedFrom;
  const expected = generatedFrom?.previousDigest;
  if (typeof expected !== "string") return null;

  const revisions = spawnSync("git", ["rev-list", "HEAD"], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  if (revisions.status !== 0) return null;
  for (const revision of revisions.stdout.split(/\r?\n/u)) {
    if (!/^[0-9a-f]{40}$/u.test(revision)) continue;
    const candidate = spawnSync(
      "git",
      ["show", `${revision}:tests/no-silent-drop/baseline.json`],
      { cwd: repoRoot, encoding: "utf8" },
    );
    if (candidate.status === 0 && sha256(candidate.stdout) === expected) return revision;
  }
  return null;
}
