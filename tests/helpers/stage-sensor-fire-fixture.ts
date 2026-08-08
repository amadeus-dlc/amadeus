// Shared helper for the sensor-fire path tests (t94, t95, t-sensor-fire-glob-norm).
//
// Each of those files needs the same answer: given a file the agent wrote, which
// of a stage's sensors should the hook dispatch? Three copies of that derivation
// meant three places to fix when the stage-graph shape moved, so it lives here.
//
// Returns the ID SET rather than a count. A count derived from the same graph
// the hook reads would still agree with the observed spawns if a sensor dropped
// out of the stage or its glob stopped matching — expectation and reality would
// fall together. Callers compare sets AND name the sensors they specifically
// care about.

import { readFileSync } from "node:fs";
import { join } from "node:path";

interface GraphStageForSensors {
  slug: string;
  sensors_applicable?: { id: string; matches?: string }[];
}

/** The shipped stage graph, under a harness's tools/data. */
export function frameworkGraphPath(amadeusSrc: string): string {
  return join(amadeusSrc, "tools", "data", "stage-graph.json");
}

/**
 * Sensor ids the hook should fire for `filePath`, computed the way the hook
 * itself decides: each sensor's `matches` glob against the NORMALIZED path
 * (backslashes to forward slashes — the same normalization #757 added, so a
 * Windows-shaped path resolves identically here and in the hook).
 *
 * Throws when the stage is absent from the graph rather than returning an empty
 * set, so a mis-typed slug is a loud failure instead of a vacuous pass.
 */
export function sensorsFiringFor(graphPath: string, stageSlug: string, filePath: string): string[] {
  const graph = JSON.parse(readFileSync(graphPath, "utf-8")) as GraphStageForSensors[];
  const stage = graph.find((s) => s.slug === stageSlug);
  if (stage === undefined) throw new Error(`stage "${stageSlug}" is missing from the shipped graph`);
  const norm = filePath.replace(/\\/g, "/");
  return (stage.sensors_applicable ?? [])
    .filter((s) => s.matches !== undefined && s.matches !== "" && new Bun.Glob(s.matches).match(norm))
    .map((s) => s.id)
    .sort();
}

/**
 * Sensor ids the hook actually dispatched, read off the recorded argv lines
 * (`[bun, script, "fire", <id>, ...]`) each stub dispatcher writes.
 */
export function firedSensorIdsFrom(argvLines: string[][]): string[] {
  return argvLines.map((argv) => argv[argv.indexOf("fire") + 1]).sort();
}
