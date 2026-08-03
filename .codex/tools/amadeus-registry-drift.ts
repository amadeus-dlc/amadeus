export interface RegistryComparison {
  valid: boolean;
  diagnostics: readonly string[];
  missing: readonly string[];
  unexpected: readonly string[];
  duplicateExpected: readonly string[];
  duplicateActual: readonly string[];
  expectedCount: number;
  actualCount: number;
}

export interface RegistryComparisonInput {
  expectedName: string;
  expected: readonly string[];
  actualName: string;
  actual: readonly string[];
}

function duplicateEntries(entries: readonly string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const entry of entries) {
    if (seen.has(entry)) duplicates.add(entry);
    seen.add(entry);
  }
  return [...duplicates].sort();
}

function setDifference(left: readonly string[], right: ReadonlySet<string>): string[] {
  return [...new Set(left)].filter((entry) => !right.has(entry)).sort();
}

export function compareRegistries(input: RegistryComparisonInput): RegistryComparison {
  const expectedSet = new Set(input.expected);
  const actualSet = new Set(input.actual);
  const duplicateExpected = duplicateEntries(input.expected);
  const duplicateActual = duplicateEntries(input.actual);
  const missing = setDifference(input.expected, actualSet);
  const unexpected = setDifference(input.actual, expectedSet);
  const diagnostics: string[] = [];

  if (input.expected.length === 0) {
    diagnostics.push(`${input.expectedName}: empty extraction`);
  }
  if (input.actual.length === 0) {
    diagnostics.push(`${input.actualName}: empty extraction`);
  }
  if (duplicateExpected.length > 0) {
    diagnostics.push(`${input.expectedName}: duplicate entries: ${duplicateExpected.join(", ")}`);
  }
  if (duplicateActual.length > 0) {
    diagnostics.push(`${input.actualName}: duplicate entries: ${duplicateActual.join(", ")}`);
  }
  if (missing.length > 0) {
    diagnostics.push(`${input.actualName}: missing entries: ${missing.join(", ")}`);
  }
  if (unexpected.length > 0) {
    diagnostics.push(`${input.actualName}: unexpected entries: ${unexpected.join(", ")}`);
  }
  if (input.expected.length !== input.actual.length) {
    diagnostics.push(
      `${input.expectedName} vs ${input.actualName}: cardinality mismatch ` +
        `(${input.expected.length} !== ${input.actual.length})`,
    );
  }

  return {
    valid: diagnostics.length === 0,
    diagnostics,
    missing,
    unexpected,
    duplicateExpected,
    duplicateActual,
    expectedCount: input.expected.length,
    actualCount: input.actual.length,
  };
}

function extractSwitchBody(source: string, switchName: string): string {
  const escapedName = switchName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const switchMatch = new RegExp(`switch\\s*\\(\\s*${escapedName}\\s*\\)\\s*\\{`).exec(source);
  if (switchMatch === null) return "";

  const openBrace = source.indexOf("{", switchMatch.index);
  let depth = 0;
  for (let index = openBrace; index < source.length; index += 1) {
    const character = source[index];
    if (character === "{") depth += 1;
    if (character === "}") depth -= 1;
    if (depth === 0) return source.slice(openBrace + 1, index);
  }
  return "";
}

export function extractCliDispatchVerbs(
  source: string,
  switchName = "subcommand",
): string[] {
  const body = extractSwitchBody(source, switchName);
  return [...body.matchAll(/\bcase\s+"([a-z][a-z0-9-]*)"\s*:/g)].map(
    (match) => match[1],
  );
}

export function extractCliValidVerbs(source: string): string[] {
  const match = /Unknown subcommand(?::[^.`\n]*)?\. Valid:\s*([^`"'\n]+)/.exec(source);
  if (match === null) return [];
  return match[1]
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function extractEmitterFieldOrder(source: string): string[] {
  const match = /\bconst\s+FIELD_ORDER\s*=\s*\[([\s\S]*?)\]\s*as const/.exec(source);
  if (match === null) return [];
  return [...match[1].matchAll(/"([a-z][a-z0-9_]*)"/g)].map((entry) => entry[1]);
}

export function extractStageFieldRegistry(source: string): string[] {
  const entries: string[] = [];
  const marker =
    /<!--\s*amadeus-stage-field-registry:v1:start\s*-->([\s\S]*?)<!--\s*amadeus-stage-field-registry:v1:end\s*-->/g;
  for (const block of source.matchAll(marker)) {
    for (const row of block[1].matchAll(/^\|\s*`([^`]+)`\s*\|/gm)) {
      const field = row[1];
      if (!field.includes(".") && !field.includes("[")) entries.push(field);
    }
  }
  return entries;
}
