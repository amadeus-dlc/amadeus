// t287 — docs semantic marker contract.
// covers: scripts/mirror-docs-contract.ts
// size: medium

import { afterEach, describe, expect, test } from "bun:test";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { validateMirrorDocs } from "../../scripts/mirror-docs-contract.ts";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

function docsFixture(): string {
  const root = mkdtempSync(join(tmpdir(), "mirror-docs-"));
  roots.push(root);
  cpSync(join(process.cwd(), "docs"), join(root, "docs"), { recursive: true });
  return root;
}

describe("t287 docs contract", () => {
  test("accepts four documents and 32 runtime-derived topics", () => {
    expect(validateMirrorDocs(process.cwd())).toEqual([]);
  });

  test("detects same-wrong locale values, duplicates, and unknown topics", () => {
    const root = docsFixture();
    for (const locale of [
      "docs/guide/22-intent-mirror.md",
      "docs/guide/22-intent-mirror.ja.md",
    ]) {
      const path = join(root, locale);
      writeFileSync(
        path,
        readFileSync(path, "utf-8").replace(
          '"defaultMode":"prompt"',
          '"defaultMode":"auto"',
        ),
      );
    }
    const reference = join(root, "docs/reference/20-intent-mirror.md");
    writeFileSync(
      reference,
      `${readFileSync(reference, "utf-8")}\n<!-- amadeus-topic:unknown -->\n`,
    );
    const findings = validateMirrorDocs(root);
    expect(findings.some((finding) => finding.message.includes("runtime contract mismatch"))).toBe(true);
    expect(findings.some((finding) => finding.message.includes("unknown topic"))).toBe(true);
  });
});
