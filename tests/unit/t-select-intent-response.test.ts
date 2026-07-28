// covers: function:createIntentSelectionToken, function:intentSelectionOptions, function:intentSelectionTokenMatchesOptions, function:resolveIntentSelectionResponse
// size: small

import { describe, expect, test } from "bun:test";
import {
  createIntentSelectionToken,
  intentSelectionOptions,
  intentSelectionTokenMatchesOptions,
  resolveIntentSelectionResponse,
} from "../../packages/framework/core/tools/amadeus-intent-selection.ts";

const options = ["first-intent", "second-intent"];
const token = createIntentSelectionToken(options);

describe("intent selection response resolution", () => {
  test.each([
    ["1", "first-intent"],
    ["１", "first-intent"],
    [" ２ ", "second-intent"],
    ["second-intent", "second-intent"],
  ])("resolves %p to the exact displayed option", (response, target) => {
    expect(resolveIntentSelectionResponse(token, response)).toEqual({
      kind: "resolved",
      target,
    });
  });

  test.each(["", "0", "3", "unknown-intent"])(
    "rejects an answer that does not identify a displayed option: %p",
    (response) => {
      expect(resolveIntentSelectionResponse(token, response)).toMatchObject({
        kind: "rejected",
      });
    },
  );

  test("rejects a modified token instead of trusting caller-supplied semantics", () => {
    expect(resolveIntentSelectionResponse(`${token}x`, "1")).toEqual({
      kind: "rejected",
      message: "Intent selection token is invalid.",
    });
  });

  test.each([[[]], [[""]], [["   "]], [["same", "same"]]])(
    "refuses to create a token for an invalid option set: %p",
    (invalidOptions) => {
      expect(() => createIntentSelectionToken(invalidOptions)).toThrow();
    },
  );

  test("the token is deterministic for the exact displayed order", () => {
    expect(createIntentSelectionToken(options)).toBe(token);
    expect(createIntentSelectionToken([...options].reverse())).not.toBe(token);
    expect(intentSelectionTokenMatchesOptions(token, options)).toBe(true);
    expect(intentSelectionTokenMatchesOptions(token, [...options].reverse())).toBe(false);
  });

  test("derives unambiguous display options from the registry snapshot", () => {
    expect(intentSelectionOptions([
      { slug: "same", dirName: "260101-same-aaaaaaaa" },
      { slug: "same", dirName: "260102-same-bbbbbbbb" },
      { slug: "unique", dirName: "260103-unique-cccccccc" },
    ])).toEqual([
      "260101-same-aaaaaaaa",
      "260102-same-bbbbbbbb",
      "unique",
    ]);
  });
});
