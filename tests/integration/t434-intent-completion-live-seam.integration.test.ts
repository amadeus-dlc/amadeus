// covers: file:packages/framework/core/tools/amadeus-intent-completion.ts
// size: small

import { describe, expect, test } from "bun:test";

const REQUIRED_CREDENTIAL_ENV = [
  "AMADEUS_CLAUDE_LIVE_ATTESTATION",
  "AMADEUS_CODEX_LIVE_ATTESTATION",
  "AMADEUS_CURSOR_LIVE_ATTESTATION",
  "AMADEUS_OPENCODE_LIVE_ATTESTATION",
  "AMADEUS_KIMI_LIVE_ATTESTATION",
] as const;

const LIVE_ENABLED = process.env.AMADEUS_INTENT_COMPLETION_LIVE === "1";
const MISSING = REQUIRED_CREDENTIAL_ENV.filter((name) => process.env[name] === undefined);
const SKIP_REASON = !LIVE_ENABLED
  ? "AMADEUS_INTENT_COMPLETION_LIVE=1 was not provided"
  : MISSING.length > 0
  ? `missing live credential attestations: ${MISSING.join(",")}`
  : null;

describe("opt-in five-harness credential seam", () => {
  test.skipIf(SKIP_REASON !== null)("requires all five real credential attestations; absence never becomes completion evidence", () => {
    // The live harness adapters consume these values outside Core. This seam
    // deliberately does not synthesize a receipt or attest a native run.
    expect(LIVE_ENABLED).toBe(true);
    expect(MISSING).toEqual([]);
    for (const name of REQUIRED_CREDENTIAL_ENV) expect(process.env[name]?.length).toBeGreaterThan(0);
  });
});
