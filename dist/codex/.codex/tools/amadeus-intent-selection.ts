import { createHash } from "node:crypto";

type SelectableIntentStatus = "in-flight" | "parked" | "complete";

type IntentSelectionCandidate = {
  uuid: string;
  slug: string;
  status: string;
  dirName: string | null;
  active: boolean;
};

type SelectableCandidate = IntentSelectionCandidate & {
  dirName: string;
  status: SelectableIntentStatus;
};

export type IntentSelectionTarget = Readonly<{
  uuid: string;
  dirName: string;
  status: SelectableIntentStatus;
}>;

export type IntentSelectionChoice = Readonly<{
  label: string;
  target: IntentSelectionTarget;
}>;

export type IntentSelectionSnapshot = Readonly<{
  choices: readonly IntentSelectionChoice[];
  fingerprint: string;
}>;

export type IntentSelectionResolution =
  | { kind: "resolved"; target: IntentSelectionTarget }
  | { kind: "rejected"; message: string };

function isSelectableStatus(status: string): status is SelectableIntentStatus {
  return status === "in-flight" || status === "parked" || status === "complete";
}

function isSelectableCandidate(intent: IntentSelectionCandidate): intent is SelectableCandidate {
  return (
    intent.uuid.trim().length > 0
    && intent.dirName !== null
    && isSelectableStatus(intent.status)
  );
}

function choiceLabels(
  intents: readonly SelectableCandidate[],
): string[] {
  const slugCounts = new Map<string, number>();
  for (const intent of intents) {
    if (intent.slug.trim().length > 0) {
      slugCounts.set(intent.slug, (slugCounts.get(intent.slug) ?? 0) + 1);
    }
  }
  const concise = intents.map((intent) =>
    intent.slug.trim().length > 0 && slugCounts.get(intent.slug) === 1
      ? intent.slug
      : intent.dirName,
  );
  // A unique slug can still equal another row's disambiguating directory name.
  // In that rare cross-namespace collision, directory names are the only
  // uniformly unambiguous labels.
  return new Set(concise).size === concise.length
    ? concise
    : intents.map((intent) => intent.dirName);
}

function snapshotFingerprint(
  space: string,
  choices: readonly IntentSelectionChoice[],
): string {
  const material = {
    domain: "amadeus.intent-selection",
    version: 2,
    space,
    choices: choices.map((choice) => ({
      label: choice.label,
      uuid: choice.target.uuid,
      dirName: choice.target.dirName,
    })),
  };
  return createHash("sha256").update(JSON.stringify(material)).digest("hex");
}

export function buildIntentSelectionSnapshot(
  space: string,
  intents: readonly IntentSelectionCandidate[],
): IntentSelectionSnapshot | null {
  const selectable = intents.filter(isSelectableCandidate);
  if (selectable.length === 0) return null;
  const labels = choiceLabels(selectable);
  if (new Set(labels).size !== labels.length) {
    throw new Error("Intent selection labels must be unique.");
  }
  if (new Set(selectable.map((intent) => intent.uuid)).size !== selectable.length) {
    throw new Error("Intent selection UUIDs must be unique.");
  }
  if (new Set(selectable.map((intent) => intent.dirName)).size !== selectable.length) {
    throw new Error("Intent selection record directories must be unique.");
  }
  const choices = selectable.map((intent, index) =>
    Object.freeze({
      label: labels[index],
      target: Object.freeze({
        uuid: intent.uuid,
        dirName: intent.dirName,
        status: intent.status,
      }),
    }),
  );
  return Object.freeze({
    choices: Object.freeze(choices),
    fingerprint: snapshotFingerprint(space, choices),
  });
}

function resolveResponse(
  choices: readonly IntentSelectionChoice[],
  response: string,
): IntentSelectionResolution {
  const normalized = response.normalize("NFKC").trim();
  if (/^[1-9]\d*$/.test(normalized)) {
    const selected = choices[Number.parseInt(normalized, 10) - 1];
    if (selected) return { kind: "resolved", target: selected.target };
  }
  const exact = choices.find(
    (choice) => choice.label.normalize("NFKC") === normalized,
  );
  if (exact) return { kind: "resolved", target: exact.target };
  return {
    kind: "rejected",
    message: `Intent selection "${response}" does not match a displayed option. Choose 1-${choices.length} or an exact option name.`,
  };
}

export function resolveCurrentIntentSelectionResponse(
  space: string,
  intents: readonly IntentSelectionCandidate[],
  token: string,
  response: string,
): IntentSelectionResolution {
  if (intents.some((intent) => intent.active)) {
    return {
      kind: "rejected",
      message: "Intent selection is no longer pending because an active intent is set.",
    };
  }
  const snapshot = buildIntentSelectionSnapshot(space, intents);
  if (snapshot === null) {
    return {
      kind: "rejected",
      message:
        "No selectable intents remain because the current entries are orphaned, registry-only, or archived. Repair the registry or unarchive an intent, then re-run the selection.",
    };
  }
  if (token !== snapshot.fingerprint) {
    return {
      kind: "rejected",
      message:
        "Intent selection token does not match the current registry snapshot or space. Re-run the selection.",
    };
  }
  return resolveResponse(snapshot.choices, response);
}
