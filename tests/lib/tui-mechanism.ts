import {
  hasImportedCall,
  type ImportedCallQuery,
} from "./typescript-source.ts";

const TUI_CALL: ImportedCallQuery = {
  module: "../harness/tui-client.ts",
  exportNames: new Set([
    "runTuiDriver",
    "runTuiDriverToExit",
    "waitForTui",
  ]),
};

/** Reports whether source contains a call expression bound to the canonical
 * TUI client import. Symbol identity keeps aliases working while excluding
 * shadowed locals, comments, strings, import-only references, and direct
 * driver bypasses; call-graph reachability is intentionally out of scope. */
export function drivesTuiSurface(src: string): boolean {
  return hasImportedCall(src, TUI_CALL);
}
