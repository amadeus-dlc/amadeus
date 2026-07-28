export type IntentSelectionResolution =
  | { kind: "resolved"; target: string }
  | { kind: "rejected"; message: string };

export function resolveIntentSelectionResponse(
  options: readonly string[],
  response: string,
): IntentSelectionResolution {
  if (options.length === 0) {
    return { kind: "rejected", message: "Intent selection has no displayed options." };
  }
  if (new Set(options).size !== options.length) {
    return { kind: "rejected", message: "Intent selection options are not unique." };
  }
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
