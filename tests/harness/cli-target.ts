import { basename } from "node:path";

const AMADEUS_TOOL_NAME = /^amadeus-[A-Za-z0-9_-]+\.ts$/;

export function isAmadeusToolPath(path: string): boolean {
  return AMADEUS_TOOL_NAME.test(basename(path));
}

/**
 * Marks and validates an indirect path that is executed as an Amadeus CLI tool.
 *
 * Coverage mechanism discovery recognizes this call at the spawn target. The
 * runtime check keeps that declaration honest when the path comes from a
 * fixture, object property, or generated harness tree.
 */
export function amadeusToolTarget(path: string): string {
  if (!isAmadeusToolPath(path)) {
    throw new Error(`not an Amadeus CLI tool target: ${path}`);
  }
  return path;
}
