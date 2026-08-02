// t413 (integration) — glossary projection generator against a real filesystem.
// covers: scripts/glossary-projection.ts
// size: medium
//
// The unit twin (tests/unit/t413-glossary-projection.test.ts) drives the pure
// parsing/validation/render layer. This twin drives `write` and `check` over a
// throwaway repo tree: the write/check round trip, drift detection, and each
// fail-closed condition that only exists once real files are involved.

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
  cliEntry,
  KNOWLEDGE_SURFACE_PATH,
  planSurfaces,
  SURFACES,
} from "../../scripts/glossary-projection.ts";

const CANON_EN = [
  "# Glossary",
  "",
  "| Term | Definition |",
  "|------|-----------|",
  "| **Bolt** | One pass through the Construction stages. |",
  "| **Scope** | Named configuration under `<harness-dir>/scopes/`. |",
  "",
  "## Projection Manifest",
  "",
  "```yaml",
  "projections:",
  "  protocol:",
  "    terms: [bolt, scope]",
  "  reference:",
  "    terms: [bolt]",
  "  knowledge:",
  "    terms: all",
  "```",
  "",
].join("\n");

const CANON_JA = [
  "# 用語集",
  "",
  "| 用語 | 定義 |",
  "|------|-----------|",
  "| **Bolt** | Construction ステージの 1 回の通過。 |",
  "| **Scope(スコープ)** | `<harness-dir>/scopes/` 配下の名前付き設定。 |",
  "",
].join("\n");

function marked(projection: string, heading: string): string {
  return [
    heading,
    "",
    `<!-- glossary:projection:begin ${projection} -->`,
    "| Term | Definition |",
    "|------|-----------|",
    "| **Stale** | old |",
    "<!-- glossary:projection:end -->",
    "",
    "## After",
    "",
  ].join("\n");
}

let root = "";

function write(rel: string, content: string): void {
  const path = join(root, rel);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, "utf-8");
}

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf-8");
}

function surfacePath(projection: string, language: string): string {
  const surface = SURFACES.find((s) => s.projection === projection && s.language === language);
  if (!surface) throw new Error(`no surface for ${projection}/${language}`);
  return surface.path;
}

const PROTOCOL_PATH = surfacePath("protocol", "en");
const REFERENCE_EN_PATH = surfacePath("reference", "en");
const REFERENCE_JA_PATH = surfacePath("reference", "ja");

function seed(): void {
  write("docs/guide/glossary.md", CANON_EN);
  write("docs/guide/glossary.ja.md", CANON_JA);
  write(PROTOCOL_PATH, marked("protocol", "## 9. Terminology"));
  write(REFERENCE_EN_PATH, marked("reference", "## Terminology Glossary"));
  write(REFERENCE_JA_PATH, marked("reference", "## Terminology Glossary"));
}

function run(argv: readonly string[]): { code: number; out: string[]; err: string[] } {
  const out: string[] = [];
  const err: string[] = [];
  const code = cliEntry(argv, root, (m) => out.push(m), (m) => err.push(m));
  return { code, out, err };
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "t413-glossary-"));
  seed();
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe("write / check round trip", () => {
  test("write renders every surface and check then reports them in sync", () => {
    expect(run(["write"]).code).toBe(0);

    const knowledge = read(KNOWLEDGE_SURFACE_PATH);
    expect(knowledge).toContain("| **Bolt** | One pass through the Construction stages. |");
    expect(knowledge).toContain("{{HARNESS_DIR}}/scopes/");
    expect(knowledge).not.toContain("<harness-dir>");

    // protocol: subset in canonical order, core tokens
    const protocol = read(PROTOCOL_PATH);
    expect(protocol).toContain("## 9. Terminology");
    expect(protocol).toContain("| **Scope** | Named configuration under `{{HARNESS_DIR}}/scopes/`. |");
    expect(protocol).not.toContain("Stale");

    // reference: narrower subset, neutral token preserved, JA definitions on the JA face
    expect(read(REFERENCE_EN_PATH)).toContain("| **Bolt** | One pass through the Construction stages. |");
    expect(read(REFERENCE_EN_PATH)).not.toContain("Scope");
    expect(read(REFERENCE_JA_PATH)).toContain("| **Bolt** | Construction ステージの 1 回の通過。 |");

    const checked = run(["check"]);
    expect(checked.code).toBe(0);
    expect(checked.out.join("\n")).toContain("in sync");
  });

  test("write is a no-op on a second run and check detects hand edits", () => {
    run(["write"]);
    const before = read(PROTOCOL_PATH);
    const second = run(["write"]);
    expect(second.code).toBe(0);
    expect(read(PROTOCOL_PATH)).toBe(before);

    writeFileSync(join(root, PROTOCOL_PATH), before.replace("One pass", "Tampered"), "utf-8");
    const drifted = run(["check"]);
    expect(drifted.code).toBe(1);
    expect(drifted.err.join("\n")).toContain(PROTOCOL_PATH);
  });

  test("an unknown subcommand fails loudly", () => {
    const result = run(["explode"]);
    expect(result.code).toBe(1);
    expect(result.err.join("\n")).toContain("explode");
  });
});

describe("fail-closed conditions", () => {
  function codesFor(): readonly string[] {
    return planSurfaces(root).violations.map((v) => v.code);
  }

  test("EN/JA key set mismatch", () => {
    write("docs/guide/glossary.ja.md", CANON_JA.replace(/^\| \*\*Scope.*$/mu, ""));
    expect(codesFor()).toContain("en-ja-key-mismatch");
    expect(run(["write"]).code).toBe(1);
    expect(existsSync(join(root, KNOWLEDGE_SURFACE_PATH))).toBe(false);
  });

  test("a manifest term that is not in the canonical table", () => {
    write("docs/guide/glossary.md", CANON_EN.replace("terms: [bolt, scope]", "terms: [bolt, ghost]"));
    expect(codesFor()).toContain("manifest-unknown-term");
  });

  test("a target file whose marker section is missing", () => {
    write(PROTOCOL_PATH, "## 9. Terminology\n\n| Term | Definition |\n");
    expect(codesFor()).toContain("marker-missing");
  });

  test("a marker-mode target file that does not exist at all", () => {
    rmSync(join(root, REFERENCE_JA_PATH));
    expect(codesFor()).toContain("missing-target");
  });

  test("a harness placeholder that would reach a docs surface unconverted", () => {
    // `bolt` is in the reference projection, whose surfaces keep the neutral token
    // verbatim — a core placeholder authored there would ship into the docs.
    write(
      "docs/guide/glossary.md",
      CANON_EN.replace("One pass through the Construction stages.", "See `{{HARNESS_DIR}}/scopes/`."),
    );
    const codes = codesFor();
    expect(codes).toContain("token-leak");
    expect(codes).toContain("surface-token-leak");
  });

  test("an empty effective subset for a non-`all` projection", () => {
    write("docs/guide/glossary.md", CANON_EN.replace("terms: [bolt]", "terms: []"));
    expect(codesFor()).toContain("manifest-empty-subset");
  });

  test("every violation is enumerated, not just the first", () => {
    write("docs/guide/glossary.md", CANON_EN.replace("terms: [bolt, scope]", "terms: [ghost, phantom]"));
    const details = planSurfaces(root).violations.map((v) => v.detail).join("\n");
    expect(details).toContain("ghost");
    expect(details).toContain("phantom");
  });

  test("a missing canonical file is reported rather than throwing", () => {
    rmSync(join(root, "docs/guide/glossary.ja.md"));
    const result = run(["check"]);
    expect(result.code).toBe(1);
    expect(result.err.join("\n")).toContain("glossary.ja.md");
  });
});
