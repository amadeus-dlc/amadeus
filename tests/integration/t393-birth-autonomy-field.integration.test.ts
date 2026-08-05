// covers: subcommand:amadeus-utility:intent-birth, subcommand:amadeus-bolt:set-autonomy
//
// t393 — the birth scaffold emits every field the canonical state template
// documents (#1846).
//
// Mechanism: cli — a project born by the real `intent-birth` handler, then the
// real `amadeus-bolt set-autonomy` run against it. The defect this pins was
// invisible to every existing test because each one APPENDED the
// `Construction Autonomy Mode` field to its fixture before exercising
// set-autonomy; none asserted the ENGINE emits it. So the ladder question the
// engine itself prints (`set-autonomy`) failed on every freshly born intent:
// setFieldStrict refuses to create an absent field, and no other writer exists.
//
// Two pins:
//   1. the born state carries `Construction Autonomy Mode` in `## Current
//      Status` (the canonical section per state-template.md) and set-autonomy
//      succeeds against it;
//   2. a DRIFT guard between the generated state and the canonical template's
//      field set, so a future scaffold edit that drops a documented field reds
//      here instead of at a user's ladder prompt.

import { afterAll, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { amadeusToolTarget } from "../harness/cli-target.ts";
import { cleanupTestProject, REPO_ROOT, setupIntegrationProject } from "../harness/fixtures.ts";
import { readAllAuditShards } from "../../dist/claude/.claude/tools/amadeus-lib.ts";

const BUN = process.execPath;

const toolIn = (proj: string, name: string): string => join(proj, ".claude", "tools", name);

function run(proj: string, tool: string, args: string[]): { status: number; out: string } {
  const childEnv: Record<string, string | undefined> = { ...process.env };
  delete childEnv.AMADEUS_SCOPE_MAPPING;
  const res = spawnSync(BUN, [amadeusToolTarget(toolIn(proj, tool)), ...args, "--project-dir", proj], {
    encoding: "utf-8",
    env: childEnv as Record<string, string>,
    cwd: proj,
  });
  return { status: res.status ?? -1, out: `${res.stdout ?? ""}${res.stderr ?? ""}` };
}

function recordDirOf(proj: string): string {
  const space = readFileSync(join(proj, "amadeus", "active-space"), "utf-8").trim() || "default";
  const intentsDir = join(proj, "amadeus", "spaces", space, "intents");
  const rec = readFileSync(join(intentsDir, "active-intent"), "utf-8").trim();
  return join(intentsDir, rec);
}
const readState = (proj: string): string =>
  readFileSync(join(recordDirOf(proj), "amadeus-state.md"), "utf-8");

const tempDirs: string[] = [];
afterAll(() => {
  for (const d of tempDirs) cleanupTestProject(d);
});

function bornProject(scope = "feature"): string {
  const proj = setupIntegrationProject({ noAidlcDocs: true, stripEnvScope: true });
  tempDirs.push(proj);
  expect(run(proj, "amadeus-utility.ts", ["intent-birth", "--scope", scope]).status).toBe(0);
  return proj;
}

/** `- **Field**:` names, in file order. */
function fieldNames(markdown: string): string[] {
  return [...markdown.matchAll(/^- \*\*([^*]+)\*\*:/gm)].map((m) => m[1]);
}

/** The `## <name>` section body, up to the next H2. */
function section(markdown: string, name: string): string {
  const start = markdown.indexOf(`## ${name}\n`);
  if (start === -1) return "";
  const rest = markdown.slice(start + `## ${name}\n`.length);
  const end = rest.indexOf("\n## ");
  return end === -1 ? rest : rest.slice(0, end);
}

describe("t393 birth scaffold: Construction Autonomy Mode", () => {
  test("a born state carries the field in ## Current Status, unset", () => {
    const state = readState(bornProject());
    expect(section(state, "Current Status")).toContain("- **Construction Autonomy Mode**: unset");
  });

  test("legacy gated mode reaches the new mode validation, not a missing-field failure", () => {
    const proj = bornProject();
    const stateBefore = readState(proj);
    const auditBefore = readAllAuditShards(proj);
    const r = run(proj, "amadeus-bolt.ts", ["set-autonomy", "--mode", "gated"]);
    expect(r.out).not.toContain("Field not found");
    expect(r.status).toBe(1);
    expect(r.out).toContain("Must be 'none', 'semi', or 'full'");
    expect(readState(proj)).toBe(stateBefore);
    const auditAfter = readAllAuditShards(proj);
    const committedBefore = auditBefore.match(/INTENT_AUTONOMY_TRANSACTION_COMMITTED/g)?.length ?? 0;
    const committedAfter = auditAfter.match(/INTENT_AUTONOMY_TRANSACTION_COMMITTED/g)?.length ?? 0;
    expect(committedAfter).toBe(committedBefore);
  });
});

describe("t393 drift guard: generated state vs canonical state-template.md", () => {
  // The canonical template is prose documentation (no code reads it), so it can
  // only be kept honest by comparing it to what the engine actually emits.
  const TEMPLATE = join(
    REPO_ROOT,
    "packages",
    "framework",
    "core",
    "knowledge",
    "amadeus-shared",
    "state-template.md",
  );
  // Fields the ENGINE emits that the template does not document yet. Pinned so
  // the set cannot grow silently; shrinking it documents an existing field.
  const KNOWN_TEMPLATE_GAPS = ["Test Strategy"];

  test("every field the template documents is emitted by birth", () => {
    const generated = new Set(fieldNames(readState(bornProject())));
    const documented = fieldNames(readFileSync(TEMPLATE, "utf-8"));
    expect(documented.filter((f) => !generated.has(f))).toEqual([]);
  });

  test("the engine emits no undocumented field beyond the pinned template gaps", () => {
    const generated = fieldNames(readState(bornProject()));
    const documented = new Set(fieldNames(readFileSync(TEMPLATE, "utf-8")));
    expect(generated.filter((f) => !documented.has(f))).toEqual(KNOWN_TEMPLATE_GAPS);
  });
});
