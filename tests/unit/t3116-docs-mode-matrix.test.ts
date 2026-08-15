// covers: file:amadeus/spaces/default/intents/260815-rfc-autonomy-modes/construction/docs-norms/mode-matrix.md
// size: small

// RFC-0001 FR-14 / R-1 (#3116), unit docs-norms. The mode × 確認ポイント matrix
// is a DERIVED document: the implementation decides, the matrix reports. This
// test is the derivation's guard — it re-derives the load-bearing cells from the
// same constants the engine reads and refuses a matrix that says something else.
//
// Two cross-checks per cell, so neither face can be edited alone:
//   (1) the machine face (the fenced YAML `checks:` block) against the
//       implementation constants, and
//   (2) the prose table cell at that (row, column) against the machine face.
// Flipping the YAML `behaviour` reddens (1); flipping the table cell reddens (2).

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  ALL_INTERACTION_KINDS,
  projectConstructionAutonomy,
  type AutonomyMode,
  type InteractionKind,
} from "../../packages/framework/core/tools/amadeus-intent-autonomy.ts";
import { nonAutoDecidedKinds } from "../../packages/framework/core/tools/amadeus-intent-autonomy-production.ts";

const MATRIX_PATH = join(
  import.meta.dir,
  "..",
  "..",
  "amadeus",
  "spaces",
  "default",
  "intents",
  "260815-rfc-autonomy-modes",
  "construction",
  "docs-norms",
  "mode-matrix.md",
);

// The four columns the matrix declares, and the header label each one renders
// as. Keyed rather than positional so a reordered table does not silently
// re-target a check at the neighbouring mode.
const COLUMN_HEADERS: Readonly<Record<string, string>> = {
  none: "none",
  semi: "semi",
  "full-interactive": "full(対話)",
  "full-non-interactive": "full(非対話)",
};

// The judgment word a cell must open with. The rest of the cell is free prose
// (the escalation branch, the audit note) — only the verdict is pinned.
const BEHAVIOUR_TOKEN: Readonly<Record<string, string>> = {
  auto: "自動",
  human: "人間",
};

interface MatrixCheck {
  readonly id: string;
  readonly row: string;
  readonly column: string;
  readonly mode: string;
  readonly kind: string;
  readonly behaviour: string;
}

const CHECK_FIELDS = ["id", "row", "column", "mode", "kind", "behaviour"] as const;

// The matrix's YAML face is a flat list of flat maps, so a full YAML parser
// would buy nothing and hide a malformed block behind a permissive reader.
// Anything this cannot read is thrown, never skipped.
function parseChecks(markdown: string): MatrixCheck[] {
  const fence = /```yaml\n([\s\S]*?)```/.exec(markdown);
  if (fence === null) throw new Error("mode-matrix.md carries no fenced yaml check block");
  const checks: Record<string, string>[] = [];
  let started = false;
  for (const raw of fence[1]!.split("\n")) {
    const line = raw.trimEnd();
    if (line.trim().length === 0) continue;
    if (/^checks:\s*$/.test(line)) {
      started = true;
      continue;
    }
    if (!started) continue;
    const item = /^\s*-\s+(\w+):\s*(.+)$/.exec(line);
    if (item !== null) {
      checks.push({ [item[1]!]: unquote(item[2]!) });
      continue;
    }
    const field = /^\s+(\w+):\s*(.+)$/.exec(line);
    if (field === null) throw new Error(`unparsable check line: ${line}`);
    const current = checks[checks.length - 1];
    if (current === undefined) throw new Error(`check field before any list item: ${line}`);
    current[field[1]!] = unquote(field[2]!);
  }
  return checks.map((check) => {
    for (const key of CHECK_FIELDS) {
      if (typeof check[key] !== "string" || check[key]!.length === 0) {
        throw new Error(`check is missing "${key}": ${JSON.stringify(check)}`);
      }
    }
    return check as unknown as MatrixCheck;
  });
}

function unquote(value: string): string {
  const trimmed = value.trim();
  return /^".*"$/.test(trimmed) ? trimmed.slice(1, -1) : trimmed;
}

type Table = ReadonlyMap<string, ReadonlyMap<string, string>>;

// Row key is the `#` column, column key is the header label — the same two
// coordinates a check names.
function parseTable(markdown: string): Table {
  const rows = markdown
    .split("\n")
    .filter((line) => line.trimStart().startsWith("|"))
    .map((line) => line.trim().slice(1, -1).split("|").map((cell) => cell.trim()));
  const header = rows[0];
  if (header === undefined || header[0] !== "#") throw new Error("mode-matrix.md carries no `#`-keyed table");
  const table = new Map<string, ReadonlyMap<string, string>>();
  for (const row of rows.slice(1)) {
    if (row.every((cell) => /^-*$/.test(cell))) continue; // the separator row
    if (row.length !== header.length) throw new Error(`table row has ${row.length} cells, header has ${header.length}`);
    const cells = new Map<string, string>();
    header.forEach((label, index) => {
      cells.set(label, row[index]!);
    });
    table.set(row[0]!, cells);
  }
  return table;
}

function isAutonomyMode(value: string): value is AutonomyMode {
  return value === "none" || value === "semi" || value === "full";
}

function isInteractionKind(value: string): value is InteractionKind {
  return (ALL_INTERACTION_KINDS as readonly string[]).includes(value);
}

// The implementation's own answer for one cell. `swarm-batch-end` is not an
// InteractionKind — batch fan-out is scheduled off the Construction projection,
// not authorized off the permission set — so it reads the projection instead.
function derivedBehaviour(mode: AutonomyMode, kind: string): string {
  if (kind === "swarm-batch-end") {
    return projectConstructionAutonomy(mode) === "autonomous" ? "auto" : "human";
  }
  if (!isInteractionKind(kind)) throw new Error(`unknown check kind: ${kind}`);
  return nonAutoDecidedKinds(mode).includes(kind) ? "human" : "auto";
}

const markdown = readFileSync(MATRIX_PATH, "utf-8");
const checks = parseChecks(markdown);
const table = parseTable(markdown);

describe("t3116 mode-matrix — FR-14/R-1 documentation-to-implementation cross-check", () => {
  test("the check set is well-formed and covers every mode", () => {
    expect(checks.length).toBeGreaterThanOrEqual(5);
    expect(new Set(checks.map((check) => check.id)).size).toBe(checks.length);
    expect(new Set(checks.map((check) => check.mode))).toEqual(new Set(["none", "semi", "full"]));
  });

  for (const check of checks) {
    test(`${check.id}: the declared behaviour is what the implementation decides`, () => {
      expect(isAutonomyMode(check.mode)).toBe(true);
      const mode = check.mode as AutonomyMode;
      expect(check.behaviour).toBe(derivedBehaviour(mode, check.kind));
    });

    test(`${check.id}: the prose table cell agrees with the declared behaviour`, () => {
      const header = COLUMN_HEADERS[check.column];
      expect(header).toBeDefined();
      const row = table.get(check.row);
      expect(row).toBeDefined();
      const cell = row!.get(header!);
      expect(cell).toBeDefined();
      const token = BEHAVIOUR_TOKEN[check.behaviour];
      expect(token).toBeDefined();
      expect(cell!.startsWith(token!)).toBe(true);
    });
  }
});
