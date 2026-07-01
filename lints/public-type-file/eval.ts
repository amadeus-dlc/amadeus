#!/usr/bin/env bun

import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

import { checkPublicTypeFile } from "./check";

const root = resolve(import.meta.dir, "../..");

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) fail(message);
}

function writeProject(files: Record<string, string>): string {
  const projectRoot = mkdtempSync(join(tmpdir(), "amadeus-public-type-file"));
  for (const [path, text] of Object.entries(files)) {
    const absolutePath = join(projectRoot, path);
    mkdirSync(dirname(absolutePath), { recursive: true });
    writeFileSync(absolutePath, text);
  }
  return projectRoot;
}

function runCheck(args: string[]): { success: boolean; output: string } {
  const result = Bun.spawnSync({
    cmd: ["bun", "run", "lints/public-type-file/check.ts", ...args],
    cwd: root,
    stdout: "pipe",
    stderr: "pipe",
  });
  return {
    success: result.success,
    output: `${result.stdout.toString()}${result.stderr.toString()}`,
  };
}

const sampleRoot = writeProject({
  "src/good.ts": `
export type Good = {
  value: string;
};

type Internal = {
  value: string;
};

class InternalImplementation {
  value = "internal";
}

export function useGood(value: Good): Internal {
  new InternalImplementation();
  return value;
}
`,
  "src/bad.ts": `
export type First = {
  value: string;
};

export interface Second {
  value: string;
}
`,
  "src/listed.ts": `
type ListedFirst = {
  value: string;
};

interface ListedSecond {
  value: string;
}

class ListedThird {
  value = "third";
}

export type { ListedFirst };
export { type ListedSecond, ListedThird };
`,
  "src/default-local.ts": `
type DefaultFirst = {
  value: string;
};

class DefaultSecond {
  value = "second";
}

export type { DefaultFirst };
export default DefaultSecond;
`,
  "src/re-export.ts": `
export type { First, Second } from "./bad";
`,
});
process.once("exit", () => {
  rmSync(sampleRoot, { recursive: true, force: true });
});

const failedCheck = checkPublicTypeFile({
  root: sampleRoot,
  include: ["src"],
});
assert(!failedCheck.ok, "file with multiple public types must fail");
assert(failedCheck.violations.length === 3, `three files must violate: ${failedCheck.violations.length}`);
assert(
  failedCheck.violations.some((violation) => violation.file === "src/listed.ts" && violation.publicTypeCount === 3),
  "same-file export list must count as public types",
);
assert(
  failedCheck.violations.some((violation) => violation.file === "src/default-local.ts" && violation.publicTypeCount === 2),
  "default export assignment of local type must count as a public type",
);
assert(
  failedCheck.messages.some((message) => message.includes("public type file violation")),
  "violation must be reported",
);

const baselineArgCheck = runCheck(["--check", "--baseline", join(sampleRoot, "public-type-file-baseline.json")]);
assert(!baselineArgCheck.success, "public-type-file lint must not accept --baseline");
assert(baselineArgCheck.output.includes("unknown argument: --baseline"), "public-type-file lint must reject --baseline");

const updateBaselineCheck = runCheck(["--update-baseline"]);
assert(!updateBaselineCheck.success, "public-type-file lint must not accept --update-baseline");
assert(updateBaselineCheck.output.includes("unknown argument: --update-baseline"), "public-type-file lint must reject --update-baseline");

const packageJson = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as {
  scripts?: Record<string, string>;
};
assert(
  packageJson.scripts?.["lint:public-type-file:report"] === "bun run lints/public-type-file/check.ts --report",
  "package script mismatch: lint:public-type-file:report",
);
assert(
  packageJson.scripts?.["lint:public-type-file:check"] === "bun run lints/public-type-file/check.ts --check",
  "package script mismatch: lint:public-type-file:check",
);
assert(
  packageJson.scripts?.["test:it:public-type-file"] === "bun run lints/public-type-file/eval.ts",
  "package script mismatch: test:it:public-type-file",
);
assert(
  packageJson.scripts?.["test:it:all"]?.includes("npm run test:it:public-type-file"),
  "test:it:all must run public-type-file eval",
);

console.log("public type file eval: ok");
