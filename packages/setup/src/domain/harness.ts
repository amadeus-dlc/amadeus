declare const harnessBrand: unique symbol;

// Branded type: prevents an unvalidated string from being mistaken for a
// checked harness name. Validation of arbitrary user input (`--harness` etc.)
// is owned by U2's cli (component-methods.md); this file owns only the type
// and the canonical 4-value list so U1 can be built and tested standalone.
export type HarnessName = ("claude" | "codex" | "kiro" | "kiro-ide") & { readonly [harnessBrand]: "HarnessName" };

export namespace HarnessName {
  export const all: readonly HarnessName[] = Object.freeze([
    "claude",
    "codex",
    "kiro",
    "kiro-ide",
  ]) as readonly HarnessName[];
}

Object.freeze(HarnessName);
