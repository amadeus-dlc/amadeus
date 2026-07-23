// covers: domain:formal-verif-arm-s-blind
// size: medium
//
// Arm S blind boundary (BR-20/BR-21): the frozen Arm S source must not import
// any Arm T / skeleton / fixture / evidence / provenance module, and its freeze
// input allowlist must contain only the four permitted public inputs. Reads the
// real source tree (fs) → integration tier.

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  ARM_S_SOURCE_FILES,
  INPUT_ALLOWLIST,
  scanForbidden,
} from "../../scripts/formal-verif/arm-s-runner.ts";

const SRC_DIR = join(import.meta.dir, "..", "..", "scripts", "formal-verif");
const IMPORT_RE = /(?:import|export)[^"']*from\s*["']([^"']+)["']/g;

function importSpecifiers(source: string): string[] {
  const specs: string[] = [];
  for (const match of source.matchAll(IMPORT_RE)) specs.push(match[1]!);
  return specs;
}

describe("arm-s blind boundary", () => {
  test.each([...ARM_S_SOURCE_FILES])("%s imports no forbidden module", (file) => {
    const source = readFileSync(join(SRC_DIR, file), "utf8");
    expect(scanForbidden(importSpecifiers(source))).toEqual([]);
  });

  test("the model subject only reaches the healthy election model", () => {
    const source = readFileSync(join(SRC_DIR, "arm-s-model-subject.ts"), "utf8");
    const external = importSpecifiers(source).filter((s) => !s.startsWith("./"));
    expect(external).toEqual([
      "../../packages/framework/core/tools/amadeus-election-model.ts",
      "../../packages/framework/core/tools/amadeus-election-model.ts",
    ]);
  });

  test("input allowlist is exactly the four permitted public inputs", () => {
    expect([...INPUT_ALLOWLIST].sort()).toEqual(
      [
        "packages/framework/core/tools/amadeus-election-model.ts",
        "packages/framework/core/tools/amadeus-election-store.ts",
        "scripts/formal-verif/canonical.ts",
        "scripts/formal-verif/contract.ts",
      ].sort(),
    );
  });
});
