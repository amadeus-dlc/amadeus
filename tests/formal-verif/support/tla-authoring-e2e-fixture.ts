// Shared fixture data for the U5 authoring E2E (t450): the pieces BOTH the test
// process and the spawned driver need.
//
// This module is deliberately separate from the driver. The driver is spawn-only
// — importing it in-process would load a module nothing in that process executes,
// putting its whole body into the LCOV report at zero hits and flipping the
// patch lines from absent to missed (cid:code-generation:seam-placement-measured-module).
// Everything here, by contrast, is executed by the test itself when it builds the
// composed host and seeds the model map.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { canonicalIdentity } from "../../../plugins/formal-model-check/tools/canonical.ts";

export const PLUGIN = "formal-model-check";
export const SUBJECTS = ["FR-001", "FR-002", "AC-001"] as const;
export const IMPL_PATH = "packages/framework/core/tools/amadeus-unit-pool.ts";

// The map records a domain-scoped canonical identity, not a bare file hash:
// tla-model-loader-internal.ts:93-94 pins the two domains and :231 computes
// `canonicalIdentity(source, domain).sha256` over the decoded text.
const TLA_MODULE_DOMAIN = "amadeus.formal-verif.tla.module.v1";
const TLA_CFG_DOMAIN = "amadeus.formal-verif.tla.cfg.v1";

// The map a registration lands in is never empty — the validator refuses an
// empty model list — so the fixture starts from one already-registered model,
// with real bytes on disk, and the run must leave it untouched.
const SEED_MODULE = [
  "---- MODULE Seed ----",
  "EXTENDS Naturals",
  "VARIABLE seeded",
  "SeedOK == seeded \\in Nat",
  "Spec == seeded = 0 /\\ [][seeded' = seeded]_seeded",
  "====",
  "",
].join("\n");

const SEED_CONFIG = ["SPECIFICATION Spec", "INVARIANT SeedOK", ""].join("\n");

// A registered model declares the invariants it checks and the state variables
// its traces carry; the receipt refuses a model with no declared vocabulary
// (tla-model-receipt.ts:97).
export const SEED_VOCABULARY = {
  vocabulary: { namedInvariants: ["SeedOK"], traceStateVariables: ["seeded"] },
};

export function digestOf(path: string, domain: string): string {
  return canonicalIdentity(readFileSync(path, "utf8"), domain).sha256;
}

/** A model-map entry whose declared identities are the bytes actually on disk. */
export function entryFor(root: string, name: string, extra: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    name,
    model: {
      path: `amadeus/spaces/default/specs/tla/${name}.tla`,
      identity: digestOf(join(root, "amadeus", "spaces", "default", "specs", "tla", `${name}.tla`), TLA_MODULE_DOMAIN),
    },
    cfg: {
      path: `amadeus/spaces/default/specs/tla/${name}.cfg`,
      identity: digestOf(join(root, "amadeus", "spaces", "default", "specs", "tla", `${name}.cfg`), TLA_CFG_DOMAIN),
    },
    entries: [
      {
        implPath: IMPL_PATH,
        sha256: Bun.CryptoHasher.hash("sha256", readFileSync(join(root, IMPL_PATH)), "hex"),
      },
    ],
    authoringProvenance: {
      intentRecord: "amadeus/spaces/default/intents/260813-bolt-pr-attestation",
      execution: {
        auditShard: "amadeus/spaces/default/intents/260813-bolt-pr-attestation/audit/session.jsonl",
        timestamp: "2026-08-05T00:00:00Z",
        eventIdentity: "e".repeat(64),
      },
    },
    ...extra,
  };
}

export function mapText(models: readonly Record<string, unknown>[]): string {
  return `${JSON.stringify({ schemaVersion: 2, models }, null, 2)}\n`;
}

/**
 * Make the composed host look like the repository the model loader resolves:
 * it walks up from the tool's own module URL for .git + package.json, then
 * resolves specs through the shared resolver, so the registered map has to
 * live at the canonical `amadeus/spaces/default/specs/tla/`.
 */
export function repoLikeHost(host: string): void {
  mkdirSync(join(host, ".git"), { recursive: true });
  writeFileSync(join(host, "package.json"), '{"name":"e2e-host"}\n');
  // Every model-map entry names an implementation the loader hashes, and the
  // loader confines those paths to packages/framework/core/tools.
  mkdirSync(join(host, "packages", "framework", "core", "tools"), { recursive: true });
  writeFileSync(join(host, IMPL_PATH), "export const unitPool = 'fixture';\n");
  mkdirSync(join(host, "amadeus", "spaces", "default", "specs", "tla"), { recursive: true });
  writeFileSync(join(host, "amadeus", "spaces", "default", "specs", "tla", "Seed.tla"), SEED_MODULE);
  writeFileSync(join(host, "amadeus", "spaces", "default", "specs", "tla", "Seed.cfg"), SEED_CONFIG);
}
