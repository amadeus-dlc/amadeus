// amadeus-state.md（v2 state template 構造）の parse と行置換更新の契約。
// 一次情報は skills/amadeus/references/aidlc-v2/state-template.md の vendored copy である。
// 読み取りは見出し、checkbox 行、フィールド行だけを解釈し、書き込みは対象行の置換だけを行う。

export const AIDLC_SECTION_HEADINGS = [
  "Project Information",
  "Scope Configuration",
  "Workspace State",
  "Execution Plan Summary",
  "Runtime State",
  "Phase Progress",
  "Stage Progress",
  "Current Status",
  "Session Resume Point",
] as const;

export const AIDLC_PHASES = ["Initialization", "Ideation", "Inception", "Construction", "Operation"] as const;

export const AIDLC_STAGE_SLUGS_BY_PHASE: Record<string, readonly string[]> = {
  Initialization: ["workspace-scaffold", "workspace-detection", "state-init"],
  Ideation: ["intent-capture", "market-research", "feasibility", "scope-definition", "team-formation", "rough-mockups", "approval-handoff"],
  Inception: [
    "reverse-engineering",
    "practices-discovery",
    "requirements-analysis",
    "user-stories",
    "refined-mockups",
    "application-design",
    "units-generation",
    "delivery-planning",
  ],
  Construction: ["functional-design", "nfr-requirements", "nfr-design", "infrastructure-design", "code-generation", "build-and-test", "ci-pipeline"],
  Operation: [
    "deployment-pipeline",
    "environment-provisioning",
    "deployment-execution",
    "observability-setup",
    "incident-response",
    "performance-validation",
    "feedback-optimization",
  ],
};

export const AIDLC_CHECKBOX_STATES: Record<string, string> = {
  "[ ]": "Pending",
  "[-]": "Active",
  "[?]": "AwaitingApproval",
  "[R]": "Revising",
  "[x]": "Completed",
  "[S]": "Skipped",
};

export const AIDLC_PHASE_PROGRESS_VALUES = ["Pending", "Active", "Verified", "Skipped"] as const;

export type AidlcStateDocument = {
  sections: { heading: string; start: number; end: number }[];
  fields: Record<string, string>;
  phaseProgress: Record<string, string>;
  stages: { phase: string; slug: string; mark: string; annotation?: string; unit?: string; units?: string[]; line: number }[];
};

const sectionHeadingPattern = /^## (.+)$/;
const phaseHeadingPattern = /^### (.+) PHASE$/;
const perUnitPattern = /^Per unit: (.+)$/;
const fieldPattern = /^- \*\*(.+?)\*\*: ?(.*)$/;
const checkboxPattern = /^- (\[[ x?RS-]\]) ([a-z0-9-]+)(?: — (.+))?$/;

function phaseNameFromHeading(heading: string): string {
  const lower = heading.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

export function checkboxStateName(mark: string): string {
  return AIDLC_CHECKBOX_STATES[mark] ?? "Unknown";
}

export function parseAidlcState(text: string): AidlcStateDocument {
  const lines = text.split("\n");
  const doc: AidlcStateDocument = { sections: [], fields: {}, phaseProgress: {}, stages: [] };
  let currentSection = "";
  let currentPhase = "";
  let currentUnits: string[] = [];
  // 直前の意味のある行が Per unit 行だったか（連続行は集合として累積する。Issue #478 gap3）
  let lastWasPerUnit = false;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    const sectionMatch = line.match(sectionHeadingPattern);
    if (sectionMatch) {
      closeSection(doc, index);
      doc.sections.push({ heading: sectionMatch[1] ?? "", start: index, end: lines.length });
      currentSection = sectionMatch[1] ?? "";
      currentPhase = "";
      currentUnits = [];
      lastWasPerUnit = false;
      continue;
    }
    parseSectionLine(doc, currentSection, line, index, {
      setPhase: (phase) => {
        currentPhase = phase;
        currentUnits = [];
        lastWasPerUnit = false;
      },
      setUnit: (unit) => {
        // 連続する Per unit 行は集合として累積する。checkbox 行を挟んで現れた
        // Per unit 行は新しいブロックの開始として置き換える（Issue #478 gap3）
        if (lastWasPerUnit) {
          currentUnits.push(unit);
        } else {
          currentUnits = [unit];
        }
        lastWasPerUnit = true;
      },
      onCheckbox: () => {
        lastWasPerUnit = false;
      },
      getPhase: () => currentPhase,
      getUnit: () => currentUnits[currentUnits.length - 1],
      getUnits: () => (currentUnits.length > 0 ? [...currentUnits] : undefined),
    });
  }
  closeSection(doc, lines.length);
  return doc;
}

function closeSection(doc: AidlcStateDocument, end: number): void {
  const last = doc.sections[doc.sections.length - 1];
  if (last) last.end = end;
}

type ParseCursor = {
  setPhase: (phase: string) => void;
  setUnit: (unit: string) => void;
  onCheckbox: () => void;
  getPhase: () => string;
  getUnit: () => string | undefined;
  getUnits: () => string[] | undefined;
};

function parseSectionLine(doc: AidlcStateDocument, section: string, line: string, index: number, cursor: ParseCursor): void {
  if (section === "Stage Progress") {
    const phaseMatch = line.match(phaseHeadingPattern);
    if (phaseMatch) {
      cursor.setPhase(phaseNameFromHeading(phaseMatch[1] ?? ""));
      return;
    }
    const unitMatch = line.match(perUnitPattern);
    if (unitMatch) {
      cursor.setUnit((unitMatch[1] ?? "").trim());
      return;
    }
    const checkboxMatch = line.match(checkboxPattern);
    if (checkboxMatch) {
      cursor.onCheckbox();
      doc.stages.push({
        phase: cursor.getPhase(),
        slug: checkboxMatch[2] ?? "",
        mark: checkboxMatch[1] ?? "",
        annotation: checkboxMatch[3],
        unit: cursor.getUnit(),
        units: cursor.getUnits(),
        line: index,
      });
    }
    return;
  }

  const fieldMatch = line.match(fieldPattern);
  if (!fieldMatch) return;
  const key = fieldMatch[1] ?? "";
  const value = (fieldMatch[2] ?? "").trim();
  if (section === "Phase Progress") {
    doc.phaseProgress[key] = value;
  } else {
    doc.fields[key] = value;
  }
}

export function updateStageCheckbox(text: string, target: { slug: string; unit?: string; phase?: string }, mark: string): string {
  const doc = parseAidlcState(text);
  const stage = doc.stages.find(
    (entry) =>
      entry.slug === target.slug &&
      (target.unit === undefined || entry.unit === target.unit) &&
      (target.phase === undefined || entry.phase === target.phase),
  );
  if (!stage) return text;

  const lines = text.split("\n");
  const line = lines[stage.line] ?? "";
  lines[stage.line] = line.replace(checkboxPattern, (_full, _mark, slug, annotation) => {
    const suffix = annotation === undefined ? "" : ` — ${annotation}`;
    return `- ${mark} ${slug}${suffix}`;
  });
  return lines.join("\n");
}

export function updateFieldInSection(text: string, sectionHeading: string, key: string, value: string): string {
  const doc = parseAidlcState(text);
  const section = doc.sections.find((entry) => entry.heading === sectionHeading);
  if (!section) return text;

  const lines = text.split("\n");
  for (let index = section.start; index < section.end; index += 1) {
    const fieldMatch = (lines[index] ?? "").match(fieldPattern);
    if (fieldMatch && fieldMatch[1] === key) {
      lines[index] = `- **${key}**: ${value}`;
      return lines.join("\n");
    }
  }
  return text;
}

export function updateCurrentStatusField(text: string, key: string, value: string): string {
  return updateFieldInSection(text, "Current Status", key, value);
}
