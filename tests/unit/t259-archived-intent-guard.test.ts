// covers: function:guardIntentOperation function:resolveIntentOperationTargetLocked function:intentNotFoundRejection function:renderIntentOperationRejection
// @test-size small
import { describe, expect, test } from "bun:test";
import {
  guardIntentOperation,
  intentNotFoundRejection,
  renderIntentOperationRejection,
} from "../../packages/framework/core/tools/amadeus-lib.ts";

describe("archived intent guard", () => {
  test("keeps not-found distinct from archived", () => {
    const rejection = intentNotFoundRejection(
      "missing",
      "select",
      "No registry-backed record matched.",
    );
    expect(rejection.kind).toBe("intent-not-found");
    expect(rejection).not.toHaveProperty("status");
    expect(renderIntentOperationRejection(rejection)).toContain(
      'Intent "missing" was not found',
    );
  });

  test("rejects a caller-forged target", () => {
    // @ts-expect-error Callers cannot construct the branded validated target.
    expect(() => guardIntentOperation({
      identity: { dirName: "260723-example" },
      status: "archived",
    }, "select")).toThrow("requires a validated intent operation target");
  });
});
