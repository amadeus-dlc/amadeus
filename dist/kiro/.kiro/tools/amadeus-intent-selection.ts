import { createHash } from "node:crypto";

export type IntentSelectionResolution =
  | { kind: "resolved"; target: string }
  | { kind: "rejected"; message: string };

type IntentSelectionTokenPayload = {
  version: 1;
  options: string[];
};

export function intentSelectionOptions(
  intents: readonly { slug: string; dirName: string }[],
): string[] {
  const slugCounts = new Map<string, number>();
  for (const intent of intents) {
    slugCounts.set(intent.slug, (slugCounts.get(intent.slug) ?? 0) + 1);
  }
  return intents.map((intent) =>
    slugCounts.get(intent.slug) === 1 ? intent.slug : intent.dirName,
  );
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

export function createIntentSelectionToken(options: readonly string[]): string {
  const invalid = invalidOptions(options);
  if (invalid) throw new Error(invalid);
  const payload: IntentSelectionTokenPayload = { version: 1, options: [...options] };
  const encoded = Buffer.from(JSON.stringify(payload), "utf-8").toString("base64url");
  return `${encoded}.${tokenDigest(encoded)}`;
}

function optionsFromIntentSelectionToken(token: string): IntentSelectionResolution | string[] {
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
    !("options" in parsed) ||
    !isStringArray(parsed.options)
  ) {
    return { kind: "rejected", message: "Intent selection token is invalid." };
  }
  const options = parsed.options;
  const invalid = invalidOptions(options);
  return invalid ? { kind: "rejected", message: invalid } : options;
}

export function intentSelectionTokenMatchesOptions(
  token: string,
  options: readonly string[],
): boolean {
  const decoded = optionsFromIntentSelectionToken(token);
  return (
    Array.isArray(decoded) &&
    decoded.length === options.length &&
    decoded.every((option, index) => option === options[index])
  );
}

export function resolveIntentSelectionResponse(
  token: string,
  response: string,
): IntentSelectionResolution {
  const decoded = optionsFromIntentSelectionToken(token);
  if (!Array.isArray(decoded)) return decoded;
  const options = decoded;
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
