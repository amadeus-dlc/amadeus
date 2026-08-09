// amadeus-sensor-flags — the strict flag-value read shared by every per-sensor
// CLI (#2741).
//
// Each per-sensor script parses its own argv with a hand-rolled loop. The naive
// form, `out.depth = argv[++i]`, is fail-OPEN on both malformed arms:
//
//   --depth                       -> argv[++i] is undefined; the flag is
//                                    silently indistinguishable from "the flag
//                                    was never passed", so an operator typo
//                                    reads as a deliberate no-depth measurement.
//   --output-path --depth Minimal -> argv[++i] is "--depth"; the NEXT FLAG is
//                                    consumed as this flag's value, so the
//                                    sensor measures a path named "--depth" (or
//                                    accepts unit_kind:"--depth") and reports a
//                                    verdict that was never asked for.
//
// Both arms must be loud. This module is the single definition of that read —
// the sensor family's twin of the dispatcher's own parseFlags (amadeus-sensor.ts)
// and of the same idiom in amadeus-state / amadeus-bolt / amadeus-log /
// amadeus-worktree. It deliberately does NOT live in amadeus-lib: it is
// sensor-CLI argv policy, not shared domain logic, and the sensor scripts
// already import across each other (amadeus-sensor-nfr-budget imports
// canonicalDepth from amadeus-sensor-depth-budget).
//
// `fail` is injected rather than imported so each sensor keeps its own
// `amadeus-sensor-<id>: ` stderr prefix, and so unit tests can drive both arms
// in-process with a throwing double instead of a process exit.

/**
 * Read the value that must follow a flag, rejecting both malformed arms.
 *
 * @param argv  the full argument list
 * @param index the index the value is expected at (i.e. the caller's `++i`)
 * @param flag  the flag token, quoted verbatim in the error
 * @param fail  the caller's loud-exit function (never returns)
 */
export function requireFlagValue(
  argv: string[],
  index: number,
  flag: string,
  fail: (msg: string) => never,
): string {
  if (index >= argv.length) fail(`${flag} expects a value, got end of arguments.`);
  const value = argv[index];
  if (value.startsWith("--")) fail(`${flag} expects a value, got another flag: "${value}".`);
  return value;
}
