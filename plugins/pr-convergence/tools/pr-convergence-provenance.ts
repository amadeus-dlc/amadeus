import {
  AMADEUS_WORK_FIELD_LABELS,
  AMADEUS_WORK_HEADING,
  type AmadeusWorkFieldName,
  PR_TITLE_PREFIX_PATTERN,
} from "./pr-convergence-presentation.ts";

export interface AmadeusWorkFields {
  readonly intent: string;
  readonly bolt: string;
  readonly unit: string;
  readonly record: string;
  readonly uuid: string;
}

export type ProvenanceViolation =
  | { readonly kind: "title-prefix-missing" }
  | { readonly kind: "title-unit-mismatch"; readonly expected: string; readonly actual: string }
  | { readonly kind: "work-section-missing" }
  | { readonly kind: "work-field-missing"; readonly field: AmadeusWorkFieldName }
  | { readonly kind: "record-mismatch"; readonly expected: string; readonly actual: string }
  | { readonly kind: "unit-mismatch"; readonly expected: string; readonly actual: string }
  | {
      readonly kind: "title-body-inconsistent";
      readonly segment: "intent" | "bolt" | "unit";
    };

export type ProvenanceVerdict =
  | { readonly ok: true }
  | { readonly ok: false; readonly violations: readonly ProvenanceViolation[] };

export interface ProvenanceInput {
  readonly title: string;
  readonly body: string;
  readonly record: string;
  readonly unit: string;
}

type FieldKey = keyof AmadeusWorkFields;
type PartialFields = Partial<Record<FieldKey, string>>;

interface SectionScan {
  readonly found: boolean;
  readonly fields: PartialFields;
}

interface Fence {
  readonly marker: "`" | "~";
  readonly length: number;
}

interface TitleParts {
  readonly intent: string;
  readonly bolt: string;
  readonly unit: string;
}

interface ScanState {
  readonly position: "before" | "section" | "done";
  readonly fence: Fence | null;
}

function fenceRun(line: string): Fence | null {
  let cursor = 0;
  while (cursor < line.length && cursor < 4 && line[cursor] === " ") cursor += 1;
  if (cursor === 4) return null;
  const marker = line[cursor];
  if (marker !== "`" && marker !== "~") return null;
  let end = cursor;
  while (line[end] === marker) end += 1;
  return end - cursor >= 3 ? { marker, length: end - cursor } : null;
}

function closesFence(line: string, fence: Fence): boolean {
  const run = fenceRun(line);
  if (run === null || run.marker !== fence.marker || run.length < fence.length) return false;
  let cursor = 0;
  while (cursor < line.length && cursor < 4 && line[cursor] === " ") cursor += 1;
  cursor += run.length;
  while (cursor < line.length && (line[cursor] === " " || line[cursor] === "\t")) cursor += 1;
  return cursor === line.length;
}

function isH2(line: string): boolean {
  let cursor = 0;
  while (cursor < line.length && cursor < 4 && line[cursor] === " ") cursor += 1;
  if (cursor === 4 || line.slice(cursor, cursor + 2) !== "##" || line[cursor + 2] === "#") {
    return false;
  }
  const after = line[cursor + 2];
  return after === undefined || after === " " || after === "\t";
}

function lineKey(label: AmadeusWorkFieldName): FieldKey {
  return label.toLowerCase() as FieldKey;
}

function fieldValue(line: string, label: AmadeusWorkFieldName): string | null {
  const prefix = `- ${label}: \``;
  if (!line.startsWith(prefix) || !line.endsWith("`")) return null;
  const value = line.slice(prefix.length, -1);
  if (value === "" || value.includes("`") || value.includes("\r") || value.includes("\n")) {
    return null;
  }
  return value;
}

function linesOf(body: string): readonly string[] {
  return body.split("\n").map((line) => (line.endsWith("\r") ? line.slice(0, -1) : line));
}

function collectField(line: string, fields: PartialFields): void {
  for (const label of AMADEUS_WORK_FIELD_LABELS) {
    const key = lineKey(label);
    if (fields[key] !== undefined) continue;
    const value = fieldValue(line, label);
    if (value !== null) fields[key] = value;
  }
}

function advanceScan(state: ScanState, line: string, fields: PartialFields): ScanState {
  if (state.fence !== null) {
    return closesFence(line, state.fence) ? { ...state, fence: null } : state;
  }

  const opened = fenceRun(line);
  if (opened !== null) return { ...state, fence: opened };

  if (state.position === "before") {
    return line === AMADEUS_WORK_HEADING ? { position: "section", fence: null } : state;
  }
  if (isH2(line)) return { position: "done", fence: null };
  collectField(line, fields);
  return state;
}

function scanAmadeusWork(body: string): SectionScan {
  const fields: PartialFields = {};
  let state: ScanState = { position: "before", fence: null };
  for (const line of linesOf(body)) {
    state = advanceScan(state, line, fields);
    if (state.position === "done") break;
  }
  return { found: state.position !== "before", fields };
}

export function parseAmadeusWork(body: string): AmadeusWorkFields | null {
  const { found, fields } = scanAmadeusWork(body);
  if (!found) return null;
  const { intent, bolt, unit, record, uuid } = fields;
  if (
    intent === undefined ||
    bolt === undefined ||
    unit === undefined ||
    record === undefined ||
    uuid === undefined
  ) {
    return null;
  }
  return { intent, bolt, unit, record, uuid };
}

function parseTitlePrefix(title: string): TitleParts | null {
  const match = PR_TITLE_PREFIX_PATTERN.exec(title);
  if (match === null) return null;
  const [, intent, bolt, unit] = match;
  if (intent === undefined || bolt === undefined || unit === undefined) return null;
  return { intent, bolt, unit };
}

function titleViolations(title: TitleParts | null, expectedUnit: string): readonly ProvenanceViolation[] {
  if (title === null) {
    return [{ kind: "title-prefix-missing" }];
  }
  return title.unit === expectedUnit
    ? []
    : [{ kind: "title-unit-mismatch", expected: expectedUnit, actual: title.unit }];
}

function missingFieldViolations(fields: PartialFields): readonly ProvenanceViolation[] {
  const violations: ProvenanceViolation[] = [];
  for (const label of AMADEUS_WORK_FIELD_LABELS) {
    if (fields[lineKey(label)] === undefined) {
      violations.push({ kind: "work-field-missing", field: label });
    }
  }
  return violations;
}

function referenceViolations(input: ProvenanceInput, fields: PartialFields): readonly ProvenanceViolation[] {
  const violations: ProvenanceViolation[] = [];
  const { unit, record } = fields;
  if (record !== undefined && record !== input.record) {
    violations.push({ kind: "record-mismatch", expected: input.record, actual: record });
  }
  if (unit !== undefined && unit !== input.unit) {
    violations.push({ kind: "unit-mismatch", expected: input.unit, actual: unit });
  }
  return violations;
}

function consistencyViolations(
  title: TitleParts | null,
  fields: PartialFields,
): readonly ProvenanceViolation[] {
  if (title === null) return [];
  const violations: ProvenanceViolation[] = [];
  const { intent, bolt, unit } = fields;
  if (intent !== undefined && title.intent !== intent) {
    violations.push({ kind: "title-body-inconsistent", segment: "intent" });
  }
  if (bolt !== undefined && title.bolt !== bolt) {
    violations.push({ kind: "title-body-inconsistent", segment: "bolt" });
  }
  if (unit !== undefined && title.unit !== unit) {
    violations.push({ kind: "title-body-inconsistent", segment: "unit" });
  }
  return violations;
}

function bodyViolations(
  input: ProvenanceInput,
  section: SectionScan,
  title: TitleParts | null,
): readonly ProvenanceViolation[] {
  if (!section.found) return [{ kind: "work-section-missing" }];
  return [
    ...missingFieldViolations(section.fields),
    ...referenceViolations(input, section.fields),
    ...consistencyViolations(title, section.fields),
  ];
}

export function checkProvenance(input: ProvenanceInput): ProvenanceVerdict {
  const title = parseTitlePrefix(input.title);
  const violations = [
    ...titleViolations(title, input.unit),
    ...bodyViolations(input, scanAmadeusWork(input.body), title),
  ];
  return violations.length === 0 ? { ok: true } : { ok: false, violations };
}

function visibleCharacter(character: string): string {
  if (character === "\\") return "\\\\";
  if (character === "\0") return "\\0";
  if (character === "\n") return "\\n";
  if (character === "\r") return "\\r";
  if (character === "\t") return "\\t";
  const codePoint = character.charCodeAt(0);
  if (codePoint <= 0x1f || codePoint === 0x7f) {
    return `\\x${codePoint.toString(16).padStart(2, "0")}`;
  }
  if ((codePoint >= 0x80 && codePoint <= 0x9f) || codePoint === 0x2028 || codePoint === 0x2029) {
    return `\\u${codePoint.toString(16).padStart(4, "0")}`;
  }
  return character;
}

function visibleControlCharacters(value: string): string {
  return Array.from(value, visibleCharacter).join("");
}

function renderViolation(violation: ProvenanceViolation): string {
  switch (violation.kind) {
    case "title-prefix-missing":
      return "- Title must start with [intent/bolt/unit] .";
    case "title-unit-mismatch":
      return `- Title Unit mismatch: expected=${visibleControlCharacters(violation.expected)} actual=${visibleControlCharacters(violation.actual)}.`;
    case "work-section-missing":
      return `- Body is missing ${AMADEUS_WORK_HEADING}.`;
    case "work-field-missing":
      return `- ${AMADEUS_WORK_HEADING} is missing ${violation.field}.`;
    case "record-mismatch":
      return `- Record mismatch: expected=${visibleControlCharacters(violation.expected)} actual=${visibleControlCharacters(violation.actual)}.`;
    case "unit-mismatch":
      return `- Body Unit mismatch: expected=${visibleControlCharacters(violation.expected)} actual=${visibleControlCharacters(violation.actual)}.`;
    case "title-body-inconsistent":
      return `- Title and body disagree on ${violation.segment}.`;
  }
}

export function renderProvenanceRemediation(violations: readonly ProvenanceViolation[]): string {
  return [
    "Pull request provenance needs remediation:",
    ...violations.map(renderViolation),
    "",
    "Edit the title and an authored body file, then use:",
    "gh pr edit --title ... --body-file ...",
  ].join("\n");
}
