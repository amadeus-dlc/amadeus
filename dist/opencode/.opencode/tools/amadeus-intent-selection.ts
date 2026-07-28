import { createHash } from "node:crypto";

export type IntentSelectionResolution =
  | { kind: "resolved"; target: string }
  | { kind: "rejected"; message: string };

type IntentSelectionCandidate = {
  slug: string;
  dirName: string | null;
  active: boolean;
};

function hasRecordDirectory(
  intent: IntentSelectionCandidate,
): intent is IntentSelectionCandidate & { dirName: string } {
  return intent.dirName !== null;
}

type IntentSelectionTokenPayload = {
  version: 1;
  space: string;
  options: string[];
};

export function intentSelectionOptions(
  intents: readonly { slug: string; dirName: string }[],
): string[] {
  const slugCounts = new Map<string, number>();
  for (const intent of intents) {
    slugCounts.set(intent.slug, (slugCounts.get(intent.slug) ?? 0) + 1);
  }
  const concise = intents.map((intent) =>
    slugCounts.get(intent.slug) === 1 ? intent.slug : intent.dirName,
  );
  // A unique slug can still equal another row's disambiguating directory name.
  // In that rare cross-namespace collision, directory names are the only
  // uniformly unambiguous labels.
  return new Set(concise).size === concise.length
    ? concise
    : intents.map((intent) => intent.dirName);
}

function invalidOptions(options: readonly string[]): string | null {
  if (options.length === 0) return "Intent selection has no displayed options.";
  if (options.some((option) => option.trim().length === 0)) {
    return "Intent selection options contain a blank target.";
  }
  if (new Set(options).size !== options.length) {
    return "Intent selection options are not unique.";
  }
  return null;
}

function tokenDigest(encodedPayload: string): string {
  return createHash("sha256").update(encodedPayload).digest("hex");
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

type DecodedIntentSelectionToken =
  | { kind: "decoded"; space: string; options: string[] }
  | { kind: "rejected"; message: string };

export function createIntentSelectionToken(
  space: string,
  options: readonly string[],
): string {
  if (space.trim().length === 0) {
    throw new Error("Intent selection space must not be blank.");
  }
  const invalid = invalidOptions(options);
  if (invalid) throw new Error(invalid);
  const payload: IntentSelectionTokenPayload = {
    version: 1,
    space,
    options: [...options],
  };
  const encoded = Buffer.from(JSON.stringify(payload), "utf-8").toString("base64url");
  return `${encoded}.${tokenDigest(encoded)}`;
}

function decodeIntentSelectionToken(token: string): DecodedIntentSelectionToken {
  const parts = token.split(".");
  if (parts.length !== 2 || parts[1] !== tokenDigest(parts[0])) {
    return { kind: "rejected", message: "Intent selection token is invalid." };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf-8"));
  } catch {
    return { kind: "rejected", message: "Intent selection token is invalid." };
  }
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    Array.isArray(parsed) ||
    !("version" in parsed) ||
    parsed.version !== 1 ||
    !("space" in parsed) ||
    typeof parsed.space !== "string" ||
    parsed.space.trim().length === 0 ||
    !("options" in parsed) ||
    !isStringArray(parsed.options)
  ) {
    return { kind: "rejected", message: "Intent selection token is invalid." };
  }
  const options = parsed.options;
  const invalid = invalidOptions(options);
  return invalid
    ? { kind: "rejected", message: invalid }
    : { kind: "decoded", options, space: parsed.space };
}

export function intentSelectionTokenMatchesOptions(
  token: string,
  options: readonly string[],
): boolean {
  const decoded = decodeIntentSelectionToken(token);
  return (
    decoded.kind === "decoded" &&
    decoded.options.length === options.length &&
    decoded.options.every((option, index) => option === options[index])
  );
}

export function resolveIntentSelectionResponse(
  token: string,
  response: string,
): IntentSelectionResolution {
  const decoded = decodeIntentSelectionToken(token);
  if (decoded.kind === "rejected") return decoded;
  return resolveResponse(decoded.options, response);
}

function resolveResponse(
  options: readonly string[],
  response: string,
): IntentSelectionResolution {
  const normalized = response.normalize("NFKC").trim();
  if (/^[1-9]\d*$/.test(normalized)) {
    const selected = options[Number.parseInt(normalized, 10) - 1];
    if (selected) return { kind: "resolved", target: selected };
  }
  const exact = options.find((option) => option.normalize("NFKC") === normalized);
  if (exact) return { kind: "resolved", target: exact };
  return {
    kind: "rejected",
    message: `Intent selection "${response}" does not match a displayed option. Choose 1-${options.length} or an exact option name.`,
  };
}

export function resolveCurrentIntentSelectionResponse(
  space: string,
  intents: readonly IntentSelectionCandidate[],
  token: string,
  response: string,
): IntentSelectionResolution {
  const selectable = intents.filter(hasRecordDirectory);
  if (selectable.some((intent) => intent.active)) {
    return {
      kind: "rejected",
      message: "Intent selection is no longer pending because an active intent is set.",
    };
  }
  const currentOptions = intentSelectionOptions(selectable);
  const decoded = decodeIntentSelectionToken(token);
  if (
    decoded.kind === "rejected" ||
    decoded.space !== space ||
    decoded.options.length !== currentOptions.length ||
    !decoded.options.every((option, index) => option === currentOptions[index])
  ) {
    return {
      kind: "rejected",
      message:
        "Intent selection token does not match the current registry options or space. Re-run the selection.",
    };
  }
  return resolveResponse(decoded.options, response);
}
