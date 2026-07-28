// covers: function:createIntentSelectionToken, function:intentSelectionOptions, function:intentSelectionTokenMatchesOptions, function:resolveIntentSelectionResponse
// size: small

import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import {
  createIntentSelectionToken,
  intentSelectionOptions,
  intentSelectionTokenMatchesOptions,
  resolveCurrentIntentSelectionResponse,
  resolveIntentSelectionResponse,
} from "../../packages/framework/core/tools/amadeus-intent-selection.ts";

const options = ["first-intent", "second-intent"];
const token = createIntentSelectionToken("default", options);

function tokenForPayload(payload: string): string {
  const encoded = Buffer.from(payload, "utf-8").toString("base64url");
  const digest = createHash("sha256").update(encoded).digest("hex");
  return `${encoded}.${digest}`;
}

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

  test.each([
    ["not-json"],
    [JSON.stringify(null)],
    [JSON.stringify({ version: 2, space: "default", options })],
    [JSON.stringify({ version: 1, options })],
    [JSON.stringify({ version: 1, space: "default", options: [1, 2] })],
  ])("rejects a validly digested malformed payload: %p", (payload) => {
    expect(resolveIntentSelectionResponse(tokenForPayload(payload), "1")).toEqual({
      kind: "rejected",
      message: "Intent selection token is invalid.",
    });
  });

  test.each([[[]], [[""]], [["   "]], [["same", "same"]]])(
    "refuses to create a token for an invalid option set: %p",
    (invalidOptions) => {
      expect(() => createIntentSelectionToken("default", invalidOptions)).toThrow();
    },
  );

  test("refuses to create a token without a concrete space", () => {
    expect(() => createIntentSelectionToken(" ", options)).toThrow(
      "Intent selection space must not be blank.",
    );
  });

  test("the token is deterministic for the exact displayed order", () => {
    expect(createIntentSelectionToken("default", options)).toBe(token);
    expect(createIntentSelectionToken("default", [...options].reverse())).not.toBe(token);
    expect(createIntentSelectionToken("other", options)).not.toBe(token);
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

  test("falls back to record directories when concise labels collide across namespaces", () => {
    expect(intentSelectionOptions([
      { slug: "same", dirName: "260101-same-aaaaaaaa" },
      { slug: "same", dirName: "260102-same-bbbbbbbb" },
      {
        slug: "260101-same-aaaaaaaa",
        dirName: "260103-260101-same-aaaaaaaa-cccccccc",
      },
    ])).toEqual([
      "260101-same-aaaaaaaa",
      "260102-same-bbbbbbbb",
      "260103-260101-same-aaaaaaaa-cccccccc",
    ]);
  });

  test("rejects a snapshot from another space even when its option labels match", () => {
    expect(
      resolveCurrentIntentSelectionResponse(
        "other",
        [
          { slug: "first-intent", dirName: "260101-first-intent-aaaaaaaa", active: false },
          { slug: "second-intent", dirName: "260101-second-intent-bbbbbbbb", active: false },
        ],
        token,
        "1",
      ),
    ).toEqual({
      kind: "rejected",
      message:
        "Intent selection token does not match the current registry options or space. Re-run the selection.",
    });
  });
});
