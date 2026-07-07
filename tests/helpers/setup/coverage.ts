import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { REPO_ROOT } from "../../harness/fixtures.ts";

export const SETUP_TEST_FILES = [
  "tests/unit/t202-setup-package-shell.test.ts",
  "tests/unit/t203-setup-version-resolver.test.ts",
  "tests/unit/t204-setup-source-distribution.test.ts",
  "tests/unit/t205-setup-target-state.test.ts",
  "tests/unit/t206-setup-operation-planning.test.ts",
  "tests/unit/t207-setup-apply-verify-ux.test.ts",
  "tests/unit/t208-setup-test-harness.test.ts",
] as const;

export type SetupCoverageEntry = {
  file: string;
  covers: string[];
  requirements: string[];
  stories: string[];
};

function parseCoversHeader(content: string): string[] {
  const match = content.match(/^\/\/ covers:\s*(.+)$/m);
  if (!match) {
    return [];
  }
  return match[1].split(",").map((item) => item.trim()).filter(Boolean);
}

export function collectSetupCoverageEntries(): SetupCoverageEntry[] {
  return SETUP_TEST_FILES.map((file) => {
    const absolute = join(REPO_ROOT, file);
    const content = readFileSync(absolute, "utf-8");
    const covers = parseCoversHeader(content);
    return {
      file,
      covers,
      requirements: covers.filter((item) => item.startsWith("requirements:")).map((item) => item.slice("requirements:".length)),
      stories: covers.filter((item) => item.startsWith("stories:")).map((item) => item.slice("stories:".length)),
    };
  });
}

export function assertSetupCoverageHandoff(): { ok: true; entries: SetupCoverageEntry[] } | { ok: false; missing: string[] } {
  const missing = SETUP_TEST_FILES.filter((file) => !existsSync(join(REPO_ROOT, file)));
  if (missing.length > 0) {
    return { ok: false, missing: [...missing] };
  }
  const entries = collectSetupCoverageEntries();
  const missingHeaders = entries.filter((entry) => entry.covers.length === 0).map((entry) => entry.file);
  if (missingHeaders.length > 0) {
    return { ok: false, missing: missingHeaders };
  }
  return { ok: true, entries };
}
