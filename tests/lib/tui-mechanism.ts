import ts from "typescript";
import {
  importedBindingOf,
  sourceWithTypeChecker,
  visitNodes,
} from "./typescript-source.ts";

const TUI_CLIENT_EXPORTS = new Set([
  "runTuiDriver",
  "runTuiDriverToExit",
  "waitForTui",
]);
const TUI_SURFACE_CACHE = new Map<string, boolean>();
const MECHANISM_SCAN_FILE = "/tui-mechanism-scan.ts";

function isClientCall(
  call: ts.CallExpression,
  checker: ts.TypeChecker,
): boolean {
  if (!ts.isIdentifier(call.expression)) return false;
  const imported = importedBindingOf(call.expression, checker);
  return !!imported &&
    imported.module.endsWith("/tui-client.ts") &&
    TUI_CLIENT_EXPORTS.has(imported.name);
}

/** Reports whether source calls a binding imported from the canonical TUI
 * client. Symbol identity keeps aliases working while excluding shadowed
 * locals, comments, strings, import-only references, and direct driver
 * bypasses. */
export function drivesTuiSurface(src: string): boolean {
  if (!src.includes("tui-client.ts")) return false;
  const cached = TUI_SURFACE_CACHE.get(src);
  if (cached !== undefined) return cached;

  const { sourceFile, checker } = sourceWithTypeChecker(
    src,
    MECHANISM_SCAN_FILE,
  );
  let found = false;
  visitNodes(sourceFile, (node) => {
    if (found || !ts.isCallExpression(node)) return;
    if (isClientCall(node, checker)) found = true;
  });
  TUI_SURFACE_CACHE.set(src, found);
  return found;
}
