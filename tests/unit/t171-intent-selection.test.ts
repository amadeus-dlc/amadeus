// covers: function:buildIntentSelectionSnapshot, function:resolveCurrentIntentSelectionResponse
//
// Mechanism: unit — the exported pure selection boundary is exercised without
// spawning the utility CLI or creating an intent workspace.

import { describe, expect, test } from "bun:test";
import {
  buildIntentSelectionSnapshot,
  resolveCurrentIntentSelectionResponse,
} from "../../packages/framework/core/tools/amadeus-intent-selection.ts";

type IntentCandidate =
  Parameters<typeof buildIntentSelectionSnapshot>[1][number];
type StoredIntentCandidate =
  Omit<IntentCandidate, "dirName"> & { dirName: string };

function intent(
  id: number,
  slug: string,
  overrides: Partial<StoredIntentCandidate> = {},
): StoredIntentCandidate {
  return {
    uuid: `00000000-0000-7000-8000-${id.toString().padStart(12, "0")}`,
    slug,
    status: "in-flight",
    dirName: `260101-${slug}`,
    active: false,
    ...overrides,
  };
}

const INTENTS = [
  intent(101, "poc"),
  intent(102, "feature", { status: "parked" }),
] as const;

function selectionToken(
  intents: Parameters<typeof buildIntentSelectionSnapshot>[1] = INTENTS,
  space = "default",
): string {
  const snapshot = buildIntentSelectionSnapshot(space, intents);
  if (snapshot === null) throw new Error("fixture has no selectable intents");
  return snapshot.fingerprint;
}

describe("t171 intent selection snapshot", () => {
  test("filters unselectable rows and produces stable registry-backed choices", () => {
    const snapshot = buildIntentSelectionSnapshot("default", [
      ...INTENTS,
      intent(103, "archived", { status: "archived" }),
      intent(0, "orphan", { uuid: "" }),
      { ...intent(104, "registry-only"), dirName: null },
    ]);

    expect(snapshot?.choices).toEqual([
      {
        label: "poc",
        target: {
          uuid: INTENTS[0].uuid,
          dirName: INTENTS[0].dirName,
          status: "in-flight",
        },
      },
      {
        label: "feature",
        target: {
          uuid: INTENTS[1].uuid,
          dirName: INTENTS[1].dirName,
          status: "parked",
        },
      },
    ]);
    expect(snapshot?.fingerprint).toBe(selectionToken());
  });

  test("a cross-namespace label collision falls back to record directory labels", () => {
    const snapshot = buildIntentSelectionSnapshot("default", [
      intent(201, "same", { dirName: "260101-first-record" }),
      intent(202, "same", { dirName: "260101-second-record" }),
      intent(203, "260101-first-record", { dirName: "260101-third-record" }),
    ]);

    expect(snapshot?.choices.map((choice) => choice.label)).toEqual([
      "260101-first-record",
      "260101-second-record",
      "260101-third-record",
    ]);
  });

  test.each([
    {
      name: "duplicate labels",
      intents: [
        intent(211, "same", { dirName: "260101-shared-record" }),
        intent(212, "same", { dirName: "260101-shared-record" }),
      ],
      message: "labels must be unique",
    },
    {
      name: "duplicate UUIDs",
      intents: [
        intent(221, "first"),
        intent(221, "second"),
      ],
      message: "UUIDs must be unique",
    },
    {
      name: "duplicate record directories",
      intents: [
        intent(231, "first", { dirName: "260101-shared-record" }),
        intent(232, "second", { dirName: "260101-shared-record" }),
      ],
      message: "record directories must be unique",
    },
  ])("rejects $name", ({ intents, message }) => {
    expect(() => buildIntentSelectionSnapshot("default", intents)).toThrow(message);
  });
});

describe("t171 current intent selection response", () => {
  test.each([
    {
      name: "full-width ordinal",
      response: "１",
      expected: {
        uuid: INTENTS[0].uuid,
        dirName: INTENTS[0].dirName,
        status: "in-flight" as const,
      },
    },
    {
      name: "exact displayed label",
      response: "feature",
      expected: {
        uuid: INTENTS[1].uuid,
        dirName: INTENTS[1].dirName,
        status: "parked" as const,
      },
    },
  ])("resolves a $name", ({ response, expected }) => {
    expect(
      resolveCurrentIntentSelectionResponse(
        "default",
        INTENTS,
        selectionToken(),
        response,
      ),
    ).toEqual({
      kind: "resolved",
      target: expected,
    });
  });

  const replacement = [
    {
      ...INTENTS[0],
      uuid: "00000000-0000-7000-8000-000000000199",
      dirName: "260101-poc-replacement",
    },
    INTENTS[1],
  ] as const;

  test.each([
    {
      name: "an active intent already exists",
      intents: [{ ...INTENTS[0], active: true }, INTENTS[1]],
      token: selectionToken(),
      response: "1",
      message: "no longer pending",
    },
    {
      name: "all displayed intents became archived",
      intents: INTENTS.map((intent) => ({ ...intent, status: "archived" })),
      token: selectionToken(),
      response: "1",
      message: "No selectable intents remain",
    },
    {
      name: "registry identity changed behind the same label",
      intents: replacement,
      token: selectionToken(),
      response: "1",
      message: "does not match the current registry snapshot",
    },
    {
      name: "the response is outside the displayed options",
      intents: INTENTS,
      token: selectionToken(),
      response: "3",
      message: "does not match a displayed option",
    },
  ])("rejects when $name", ({ intents, token, response, message }) => {
    const resolution = resolveCurrentIntentSelectionResponse(
      "default",
      intents,
      token,
      response,
    );

    expect(resolution.kind).toBe("rejected");
    if (resolution.kind === "rejected") {
      expect(resolution.message).toContain(message);
    }
  });
});
