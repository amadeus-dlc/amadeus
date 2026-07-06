#!/usr/bin/env bun

import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

import { analyzeBannedMarkers, checkBannedMarkers } from "./check";

const root = resolve(import.meta.dir, "../..");

// Built via concatenation so this file's own raw text never contains the
// contiguous marker the compat-comment detector searches for (BR-8).
const bannedPhrase = "後方" + "互換";

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) fail(message);
}

function writeProject(files: Record<string, string>): string {
  const projectRoot = mkdtempSync(join(tmpdir(), "amadeus-no-stub-compat"));
  for (const [path, text] of Object.entries(files)) {
    const absolutePath = join(projectRoot, path);
    mkdirSync(dirname(absolutePath), { recursive: true });
    writeFileSync(absolutePath, text);
  }
  return projectRoot;
}

function runCheck(args: string[]): { success: boolean; output: string } {
  const result = Bun.spawnSync({
    cmd: ["bun", "run", "lints/no-stub-compat/check.ts", ...args],
    cwd: root,
    stdout: "pipe",
    stderr: "pipe",
  });
  return {
    success: result.success,
    output: `${result.stdout.toString()}${result.stderr.toString()}`,
  };
}

const emptyAllowlistDocs = `# Backward Compatibility

## Lint 許可リスト（no-stub-compat）

| 対象（glob） | カテゴリ | 維持理由 | 終了条件 |
|---|---|---|---|
`;

const violationsSource = `
export const legacyValue = 1;

export const legacy_path_map = {};

export class ShimAdapter {}

// Token-boundary negatives: general English words containing a banned word as
// a SUBSTRING must not fire (human decision at the build-and-test gate).
export const compatibleFormat = "x";
export function isBackwardCompatible(): boolean {
  return true;
}
export class CompatibilityChecker {}

export { legacyValue as renamedValue };

// ${bannedPhrase} を許容する暫定コメント
export function untouchedByThisChange(): boolean {
  return true;
}

// TODO: implement pricing calculation later
export function calculatePricingLater(): void {}

export function stubThrow(): void {
  throw new Error("not implemented yet");
}

function assertAlwaysPass(): void {
  assert(true);
}

function expectAlwaysPass(): void {
  expect(true).toBe(true);
}
`;

const sampleRoot = writeProject({
  "src/violations.ts": violationsSource,
  "docs/backward-compatibility.md": emptyAllowlistDocs,
});
process.once("exit", () => {
  rmSync(sampleRoot, { recursive: true, force: true });
});

// (a) each of the 6 categories fires when nothing is declared (RED-first).
const undeclaredCheck = checkBannedMarkers({ root: sampleRoot, include: ["src"] });
assert(!undeclaredCheck.ok, "undeclared findings must fail the check");
const categories = [
  "compat-symbol",
  "compat-alias",
  "compat-comment",
  "stub-throw",
  "stub-empty-todo",
  "stub-always-pass",
] as const;
for (const category of categories) {
  assert(
    undeclaredCheck.violations.some((violation) => violation.category === category),
    `category must be detected: ${category}`,
  );
}

// Token-boundary matching (human decision, build-and-test gate): banned words
// match whole camelCase/snake_case tokens only. Substring-containing general
// words must NOT be flagged, while true token hits (legacyValue, ShimAdapter,
// legacy_path_map) keep firing.
{
  const flaggedSymbols = undeclaredCheck.violations
    .filter((violation) => violation.category === "compat-symbol")
    .map((violation) => violation.match);
  for (const allowedName of ["compatibleFormat", "isBackwardCompatible", "CompatibilityChecker"]) {
    assert(
      !flaggedSymbols.includes(allowedName),
      `substring-only identifier must not be flagged: ${allowedName}`,
    );
  }
  for (const bannedName of ["legacyValue", "legacy_path_map", "ShimAdapter"]) {
    assert(
      flaggedSymbols.includes(bannedName),
      `token-boundary identifier must stay flagged: ${bannedName}`,
    );
  }
}
assert(
  undeclaredCheck.messages.some((message) => message.includes("declare in docs/backward-compatibility.md")),
  "fail message must explain how to declare an allowlist row",
);

const rawFindings = analyzeBannedMarkers({ root: sampleRoot, include: ["src"] });
assert(rawFindings.length === undeclaredCheck.findings.length, "analyze and check must see the same findings");

// (b) a valid allowlist declaration turns the same finding to pass.
function allowlistDocsWithRows(rows: string[]): string {
  return [
    "# Backward Compatibility",
    "",
    "## Lint 許可リスト（no-stub-compat）",
    "",
    "| 対象（glob） | カテゴリ | 維持理由 | 終了条件 |",
    "|---|---|---|---|",
    ...rows,
    "",
  ].join("\n");
}

const validRows = categories.map(
  (category) => `| src/violations.ts | ${category} | 検証用 fixture のため許容する | eval 実装の見直し時に削除する |`,
);
writeFileSync(join(sampleRoot, "docs/backward-compatibility.md"), allowlistDocsWithRows(validRows));

const declaredCheck = checkBannedMarkers({ root: sampleRoot, include: ["src"] });
assert(declaredCheck.ok, `fully declared findings must pass: ${declaredCheck.messages.join("\n")}`);
assert(declaredCheck.violations.length === 0, "no violations must remain once every category is declared");

// (c) an invalid declaration (missing 維持理由) must not turn its finding to pass.
const rowsWithInvalidEntry = categories.map((category) => {
  if (category === "compat-symbol") {
    return "| src/violations.ts | compat-symbol |  | eval 実装の見直し時に削除する |";
  }
  return `| src/violations.ts | ${category} | 検証用 fixture のため許容する | eval 実装の見直し時に削除する |`;
});
writeFileSync(join(sampleRoot, "docs/backward-compatibility.md"), allowlistDocsWithRows(rowsWithInvalidEntry));

const partiallyDeclaredCheck = checkBannedMarkers({ root: sampleRoot, include: ["src"] });
assert(!partiallyDeclaredCheck.ok, "a row missing 維持理由 must not be treated as declared");
assert(
  partiallyDeclaredCheck.violations.some((violation) => violation.category === "compat-symbol"),
  "compat-symbol must remain a violation when its declaration is invalid",
);
assert(
  !partiallyDeclaredCheck.violations.some((violation) => violation.category === "compat-alias"),
  "other categories with valid declarations must not regress",
);

// CLI argument handling must match existing lint precedent.
const baselineArgCheck = runCheck(["--check", "--baseline", join(sampleRoot, "no-stub-compat-baseline.json")]);
assert(!baselineArgCheck.success, "no-stub-compat lint must not accept --baseline");
assert(baselineArgCheck.output.includes("unknown argument: --baseline"), "no-stub-compat lint must reject --baseline");

// (d) regression: the real repo tree must pass with its shipped declarations.
// This also exercises BR-8 (the rule must not need to exclude itself from the scan).
const realTreeCheck = runCheck(["--check"]);
assert(realTreeCheck.success, `no-stub-compat must pass on the real repo tree: ${realTreeCheck.output}`);
assert(realTreeCheck.output.includes("no-stub-compat: ok"), "real tree check must report ok");

// (e) package.json wiring.
const packageJson = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as {
  scripts?: Record<string, string>;
};
assert(
  packageJson.scripts?.["lint:no-stub-compat:report"] === "bun run lints/no-stub-compat/check.ts --report",
  "package script mismatch: lint:no-stub-compat:report",
);
assert(
  packageJson.scripts?.["lint:no-stub-compat:check"] === "bun run lints/no-stub-compat/check.ts --check",
  "package script mismatch: lint:no-stub-compat:check",
);
assert(
  packageJson.scripts?.["test:it:no-stub-compat"] === "bun run lints/no-stub-compat/eval.ts",
  "package script mismatch: test:it:no-stub-compat",
);
assert(
  packageJson.scripts?.["test:it:all"]?.includes("npm run test:it:no-stub-compat"),
  "test:it:all must run no-stub-compat eval",
);

console.log("no-stub-compat eval: ok");
