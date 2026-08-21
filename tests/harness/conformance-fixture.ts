// Test harness for the synthetic conformance fixture plugin.
//
// The engine's advisory channel needs a composed plugin that declares an
// advisory and can be driven between hold and no-hold. This supplies exactly
// that, out of tests/fixtures/conformance-fixture-plugin, so no production
// plugin has to stand in as a fixture.

import { cpSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/** The fixture plugin's identity — its source directory name and manifest name. */
export const FIXTURE_PLUGIN = "conformance-fixture";

/** The advisory code the fixture manifest declares. */
export const FIXTURE_ADVISORY_CODE = "fixture-change";

/** The checkpoints the fixture declaration fires at. */
export const FIXTURE_CHECKPOINTS: readonly string[] = [
  "requirements-analysis",
  "functional-design",
  "build-and-test",
];

/** The plugin-owned verdict state file; its presence releases the advisory. */
export const FIXTURE_VERDICT_STATE = ".amadeus-plugin-conformance-fixture-verdict.json";

/** The hold message the fixture evaluator emits, byte-identical to the tool's. */
export const FIXTURE_HOLD_MESSAGE =
  "advisory: conformance-fixture FIXTURE CHANGED — record a verdict to release";

/** The authoring source of the fixture plugin. */
export const FIXTURE_SOURCE = join(
  import.meta.dir,
  "..",
  "fixtures",
  "conformance-fixture-plugin",
  FIXTURE_PLUGIN,
);

/** Copy the fixture plugin onto a project's authoring face. */
export function installFixturePlugin(projectRoot: string): void {
  cpSync(FIXTURE_SOURCE, join(projectRoot, "plugins", FIXTURE_PLUGIN), { recursive: true });
}

/** Write the composition record that makes the fixture plugin composed on a host. */
export function composeFixturePlugin(hostRoot: string): void {
  mkdirSync(hostRoot, { recursive: true });
  writeFileSync(
    join(hostRoot, ".amadeus-plugin-composition.json"),
    JSON.stringify({
      ledger: [],
      plugins: [[FIXTURE_PLUGIN, { stageIndex: [{ slug: FIXTURE_PLUGIN }] }]],
    }),
  );
}

/**
 * Install and compose the fixture so its declared evaluator HOLDS: no verdict
 * has been recorded on this host yet.
 */
export function seedHoldingHost(projectRoot: string, hostRoot: string): void {
  installFixturePlugin(projectRoot);
  composeFixturePlugin(hostRoot);
  clearFixtureVerdict(hostRoot);
}

/** Record a verdict on the host, which releases the advisory (no-hold). */
export function recordFixtureVerdict(hostRoot: string): void {
  mkdirSync(hostRoot, { recursive: true });
  writeFileSync(
    join(hostRoot, FIXTURE_VERDICT_STATE),
    `${JSON.stringify({ recordedAt: "2026-07-27T00:00:00Z" })}\n`,
  );
}

/** Remove any recorded verdict, so the next evaluation holds again. */
export function clearFixtureVerdict(hostRoot: string): void {
  rmSync(join(hostRoot, FIXTURE_VERDICT_STATE), { force: true });
}
