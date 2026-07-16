// covers: lib:ensureStageDiary(created,exists,template-missing)
// size: medium
//
// Deterministic stage-diary creation (#1080): the engine auto-creates
// <record>/<phase>/<stage>/memory.md from the shipped template at run-stage
// directive issuance. Contract under test, in-process against the shipped lib:
//   - absent diary  -> created, byte-identical to the template
//   - existing diary -> NEVER overwritten (accumulated entries preserved)
//   - missing template -> "template-missing", no file created, loud on stderr
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ensureStageDiary } from "../../dist/claude/.claude/tools/amadeus-lib.ts";

const REPO_TEMPLATE = join(import.meta.dir, "..", "..", "dist", "claude", ".claude", "knowledge", "amadeus-shared", "memory-template.md");
const REL_DIARY = "amadeus/spaces/default/intents/demo-1a2b3c4d/inception/requirements-analysis/memory.md";

let projectDir: string;
let savedHarness: string | undefined;

beforeEach(() => {
  projectDir = mkdtempSync(join(tmpdir(), "ensure-diary-"));
  mkdirSync(join(projectDir, ".claude", "knowledge", "amadeus-shared"), { recursive: true });
  writeFileSync(join(projectDir, ".claude", "knowledge", "amadeus-shared", "memory-template.md"), readFileSync(REPO_TEMPLATE));
  savedHarness = process.env.AMADEUS_HARNESS_DIR;
  process.env.AMADEUS_HARNESS_DIR = ".claude";
});

afterEach(() => {
  if (savedHarness === undefined) delete process.env.AMADEUS_HARNESS_DIR;
  else process.env.AMADEUS_HARNESS_DIR = savedHarness;
  rmSync(projectDir, { recursive: true, force: true });
});

describe("ensureStageDiary", () => {
  test("creates an absent diary byte-identical to the shipped template", () => {
    const result = ensureStageDiary(projectDir, REL_DIARY);
    expect(result).toBe("created");
    const created = readFileSync(join(projectDir, REL_DIARY));
    expect(created.equals(readFileSync(REPO_TEMPLATE))).toBe(true);
  });

  test("never overwrites an existing diary (accumulated entries preserved)", () => {
    const abs = join(projectDir, REL_DIARY);
    mkdirSync(join(projectDir, "amadeus/spaces/default/intents/demo-1a2b3c4d/inception/requirements-analysis"), { recursive: true });
    const accumulated = "# Stage Diary\n\n- 2026-07-16T00:00:00Z — accumulated entry that must survive re-entry\n";
    writeFileSync(abs, accumulated);
    const result = ensureStageDiary(projectDir, REL_DIARY);
    expect(result).toBe("exists");
    expect(readFileSync(abs, "utf-8")).toBe(accumulated);
  });

  test("edge case: a missing template is loud but non-fatal and creates nothing", () => {
    rmSync(join(projectDir, ".claude", "knowledge", "amadeus-shared", "memory-template.md"));
    const result = ensureStageDiary(projectDir, REL_DIARY);
    expect(result).toBe("template-missing");
    expect(existsSync(join(projectDir, REL_DIARY))).toBe(false);
  });

  test("edge case: idempotent across repeated calls (created once, then exists)", () => {
    expect(ensureStageDiary(projectDir, REL_DIARY)).toBe("created");
    expect(ensureStageDiary(projectDir, REL_DIARY)).toBe("exists");
  });
});
