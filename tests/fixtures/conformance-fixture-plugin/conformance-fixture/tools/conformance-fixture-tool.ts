// conformance-fixture-tool.ts — the fixture plugin's only executable.
//
// It is an advisory evaluator and nothing else. The host machinery under test
// needs a plugin that (a) declares an advisory, (b) can be made to hold, and
// (c) can be released, so the advisory channel can be driven end to end from a
// test without a production plugin standing in as a fixture.
//
// State is a single marker file under the host root: absent means hold,
// present means no-hold. No imports, so the plugin's manifest closure stays
// inside its own directory.

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/**
 * The recorded-verdict marker whose presence releases the declared advisory.
 * Named under the `.amadeus-plugin` prefix so a host snapshot treats it as
 * plugin state rather than host surface, exactly as a real plugin would.
 */
export const CLEARED_MARKER = ".amadeus-plugin-conformance-fixture-verdict.json";

export function clearedMarkerPath(hostRoot: string): string {
  return join(hostRoot, CLEARED_MARKER);
}

/** The hold verdict text, kept in one place so the tests can pin it. */
export const HOLD_MESSAGE = "advisory: conformance-fixture FIXTURE CHANGED — record a verdict to release";

export function advisoryVerdict(hostRoot: string): { readonly json: string; readonly code: number } {
  if (existsSync(clearedMarkerPath(hostRoot))) {
    return { json: JSON.stringify({ verdict: { kind: "no-hold" } }), code: 0 };
  }
  return {
    json: JSON.stringify({
      verdict: { kind: "hold", reasons: [{ kind: "fixture-change" }], message: HOLD_MESSAGE },
    }),
    code: 1,
  };
}

export function recordVerdict(hostRoot: string): void {
  mkdirSync(hostRoot, { recursive: true });
  writeFileSync(clearedMarkerPath(hostRoot), `${JSON.stringify({ recordedAt: new Date().toISOString() })}\n`);
}

export function main(argv: readonly string[]): number {
  const [verb, hostRoot] = argv;
  if (verb === "sensor") {
    process.stdout.write(`${JSON.stringify({ pass: true, reason: "fixture sensor always passes" })}\n`);
    return 0;
  }
  if (hostRoot === undefined || hostRoot === "") {
    process.stderr.write("conformance-fixture: expected a host root\n");
    return 2;
  }
  if (verb === "advisory") {
    const verdict = advisoryVerdict(hostRoot);
    process.stdout.write(`${verdict.json}\n`);
    return verdict.code;
  }
  if (verb === "record") {
    recordVerdict(hostRoot);
    return 0;
  }
  process.stderr.write("conformance-fixture: expected advisory|record|sensor\n");
  return 2;
}

if (import.meta.main) process.exit(main(process.argv.slice(2)));
