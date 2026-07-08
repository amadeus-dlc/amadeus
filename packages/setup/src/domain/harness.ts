import { Result } from "../shared/result.ts";

declare const harnessBrand: unique symbol;

// Branded type: prevents an unvalidated string from being mistaken for a
// checked harness name. Validation of arbitrary user input (`--harness` etc.)
// is owned by U2's cli (component-methods.md); this file owns only the type
// and the canonical 4-value list so U1 can be built and tested standalone.
export type HarnessName = ("claude" | "codex" | "kiro" | "kiro-ide") & { readonly [harnessBrand]: "HarnessName" };

// Deliberately not UsageError: harness.ts must not depend on command.ts (that
// would create a two-directional value dependency between the two files —
// review correction 1). This is a minimal, local error shape; the one caller
// that needs a UsageError (ParsedCommand.parse in command.ts) converts it via
// UsageError.invalidHarness(raw) itself.
export type InvalidHarnessName = { readonly raw: string };

export namespace HarnessName {
  export const all: readonly HarnessName[] = Object.freeze([
    "claude",
    "codex",
    "kiro",
    "kiro-ide",
  ]) as readonly HarnessName[];

  // U2 install-flow's smart constructor for the raw `--harness` CLI value
  // (FR-003). Placed here, not in command.ts, per domain-entities.md: parse
  // is owned by the harness type itself, matching HarnessName.all's home.
  export function parse(raw: string): Result<HarnessName, InvalidHarnessName> {
    if ((all as readonly string[]).includes(raw)) {
      return Result.ok(raw as HarnessName);
    }
    return Result.err(Object.freeze({ raw }));
  }
}

Object.freeze(HarnessName);
