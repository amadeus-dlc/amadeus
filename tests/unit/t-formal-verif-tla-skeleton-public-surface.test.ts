import { describe, expect, test } from "bun:test";
import * as root from "../../scripts/formal-verif/index.ts";
import * as skeleton from "../../scripts/formal-verif/tla-skeleton.ts";

describe("TLA skeleton public surface", () => {
  test("exports the dedicated facade and terminal operations", () => {
    expect(typeof root.TlaSkeletonCoordinator).toBe("function");
    expect(typeof root.commitSkeletonOutcome).toBe("function");
    expect(typeof root.verifySkeletonStop).toBe("function");
  });

  test("keeps the command set closed before Arm S and fan-out", () => {
    expect(root.TLA_SKELETON_COMMANDS).toEqual(["prepare", "run-local", "verify-ci", "record-outcome"]);
    expect(root.TLA_SKELETON_COMMANDS.some((command) => ["start-arm-s", "promotion", "benchmark", "evaluate", "report"].includes(command))).toBe(false);
  });

  test("does not root-export an issuer or raw CI closer", () => {
    const keys = Object.keys(root);
    expect(keys).not.toContain("verifySkeletonCiAndClose");
    expect(keys.some((key) => /mint|issuer|authority|register/i.test(key) && /skeleton/i.test(key))).toBe(false);
    expect(Object.keys(skeleton)).not.toContain("verifySkeletonCiAndClose");
  });
});
