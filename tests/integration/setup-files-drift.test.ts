// covers: workflow:setup-files-drift
//
// BR-P02 (REL-P02c): package.json `files` (static JSON, cannot import
// PackContract) must stay in sync with PackContract.current().declaredInFiles()
// — the drift is caught here mechanically, the same way dist:check catches
// dist/ drift. Pure JSON read + array compare, no process spawn (≤1s budget,
// performance-design.md).

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PackContract } from "../lib/setup-pack-contract.ts";

const TESTS_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(TESTS_DIR, "..", "..");
const PACKAGE_JSON_PATH = join(REPO_ROOT, "packages", "setup", "package.json");

describe("packages/setup/package.json `files` drift (BR-P02)", () => {
  test("files field matches PackContract.current().declaredInFiles() exactly", () => {
    const pkg = JSON.parse(readFileSync(PACKAGE_JSON_PATH, "utf8"));
    const filesField: string[] = pkg.files;

    expect([...filesField].sort()).toEqual([...PackContract.current().declaredInFiles()].sort());
  });
});
