// covers: function:resolveIntentSelectionResponse
// size: small

import { describe, expect, test } from "bun:test";
import { resolveIntentSelectionResponse } from "../../packages/framework/core/tools/amadeus-intent-selection.ts";

const options = ["first-intent", "second-intent"];

describe("intent selection response resolution", () => {
  test.each([
    ["1", "first-intent"],
    ["１", "first-intent"],
    [" ２ ", "second-intent"],
    ["second-intent", "second-intent"],
  ])("resolves %p to the exact displayed option", (response, target) => {
    expect(resolveIntentSelectionResponse(options, response)).toEqual({
      kind: "resolved",
      target,
    });
  });

  test.each(["", "0", "3", "unknown-intent"])(
    "rejects an answer that does not identify a displayed option: %p",
    (response) => {
      expect(resolveIntentSelectionResponse(options, response)).toMatchObject({
        kind: "rejected",
      });
    },
  );

  test("rejects an invalid option set instead of choosing silently", () => {
    expect(resolveIntentSelectionResponse(["same", "same"], "same")).toMatchObject({
      kind: "rejected",
      message: expect.stringContaining("not unique"),
    });
  });

  test("rejects an empty option set", () => {
    expect(resolveIntentSelectionResponse([], "1")).toMatchObject({
      kind: "rejected",
      message: expect.stringContaining("no displayed options"),
    });
  });
});
