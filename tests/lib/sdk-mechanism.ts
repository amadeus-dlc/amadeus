import {
  hasImportedCall,
  type ImportedCallQuery,
} from "./typescript-source.ts";

const SDK_CALL: ImportedCallQuery = {
  module: "../harness/sdk-drive.ts",
  exportNames: new Set(["driveAidlc"]),
};

/** Reports whether source contains a call expression bound to driveAidlc from
 * the canonical SDK driver. Symbol identity keeps aliases working while
 * excluding shadowed locals, comments, strings, and import-only references;
 * call-graph reachability is intentionally out of scope. */
export function drivesSdkSurface(src: string): boolean {
  return hasImportedCall(src, SDK_CALL);
}
