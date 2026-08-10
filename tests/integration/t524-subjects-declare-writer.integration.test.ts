import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { defaultSubjectsPath, runTlaAuthoring } from "../../plugins/formal-model-check/tools/tla-authoring.ts";

// FR-1 + D4 (#2766): `authoring-subjects.json` had no writer anywhere in the
// tree, so the authoring hold evaluated an empty supply forever. The writer is
// a single verb, and D4 moves the declaration out of the `tla/**` activation
// watch glob so declaring a subject does not raise the sibling spec-hash
// advisory.

let workspace = "";
let subjectsPath = "";
let requirementsPath = "";
let storeRoot = "";
let modelMapPath = "";

async function run(argv: readonly string[]): Promise<{ exitCode: number; body: Record<string, unknown> }> {
  const lines: string[] = [];
  const exitCode = await runTlaAuthoring(argv, (line) => lines.push(line));
  expect(lines).toHaveLength(1);
  return { exitCode, body: JSON.parse(lines[0] as string) as Record<string, unknown> };
}

function declare(ids: readonly string[]): Promise<{ exitCode: number; body: Record<string, unknown> }> {
  return run([
    "subjects", "declare",
    "--document", requirementsPath,
    "--kind", "requirements",
    ...ids.flatMap((id) => ["--id", id]),
    "--out", subjectsPath,
  ]);
}

beforeEach(() => {
  workspace = mkdtempSync(join(tmpdir(), "subjects-declare-"));
  subjectsPath = join(workspace, "authoring-subjects.json");
  requirementsPath = join(workspace, "requirements.md");
  storeRoot = join(workspace, "tla-evidence");
  modelMapPath = join(workspace, "model-map.json");
  mkdirSync(storeRoot, { recursive: true });
  writeFileSync(requirementsPath, "### FR-1\ngoverned body\n\n### FR-2\nanother body\n", "utf8");
  writeFileSync(modelMapPath, JSON.stringify({ schemaVersion: 2, models: [] }), "utf8");
});

afterEach(() => {
  rmSync(workspace, { recursive: true, force: true });
});

describe("t524 the governed subjects writer", () => {
  test("the declaration path sits outside the tla activation watch glob", () => {
    const root = mkdtempSync(join(tmpdir(), "subjects-root-"));
    try {
      const resolved = defaultSubjectsPath(root);
      expect(resolved).toBe(
        join(root, "amadeus", "spaces", "default", "specs", "authoring-subjects.json"),
      );
      expect(resolved.includes(`${join("specs", "tla")}`)).toBe(false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("declare writes the supply the advisory evaluator then actually evaluates", async () => {
    const declared = await declare(["FR-1"]);
    expect(declared.exitCode).toBe(0);
    expect(declared.body.path).toBe(subjectsPath);
    expect(JSON.parse(readFileSync(subjectsPath, "utf8")) as unknown).toEqual({
      documents: [{ path: requirementsPath, kind: "requirements" }],
      subjects: ["FR-1"],
    });

    const evaluated = await run([
      "advisory", "hold",
      "--subjects-file", subjectsPath,
      "--store", storeRoot,
      "--model-map", modelMapPath,
    ]);
    expect(evaluated.exitCode).toBe(1);
    expect((evaluated.body.verdict as { kind: string }).kind).toBe("hold");
    expect(JSON.stringify(evaluated.body)).not.toContain("no governed subjects");
  });

  test("an id the documents do not define is refused and nothing is written", async () => {
    const declared = await declare(["FR-1", "FR-777"]);
    expect(declared.exitCode).toBe(1);
    expect((declared.body.failure as { kind: string }).kind).toBe("unresolvable-id");
    expect(existsSync(subjectsPath)).toBe(false);
    expect(readdirSync(workspace).filter((entry) => entry.includes(".tmp"))).toEqual([]);
  });

  test("a document set with no kind for every document is a usage error", async () => {
    const declared = await run([
      "subjects", "declare",
      "--document", requirementsPath,
      "--document", join(workspace, "second.md"),
      "--kind", "requirements",
      "--id", "FR-1",
      "--out", subjectsPath,
    ]);
    expect(declared.exitCode).toBe(2);
    expect(existsSync(subjectsPath)).toBe(false);
  });

  test("a publish that cannot reach disk fails closed as an io-failure", async () => {
    // The parent of --out is an existing FILE, so mkdirSync throws ENOTDIR on
    // every platform — the portable injection for the publish catch arm.
    const blocker = join(workspace, "not-a-dir");
    writeFileSync(blocker, "occupied", "utf8");
    const declared = await run([
      "subjects", "declare",
      "--document", requirementsPath,
      "--kind", "requirements",
      "--id", "FR-1",
      "--out", join(blocker, "authoring-subjects.json"),
    ]);
    expect(declared.exitCode).toBe(1);
    expect((declared.body.failure as { kind: string }).kind).toBe("io-failure");
    expect(readdirSync(workspace).filter((entry) => entry.includes(".tmp"))).toEqual([]);
  });
});
