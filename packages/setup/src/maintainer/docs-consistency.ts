import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { EXPECTED_PACKAGE_NAME } from "./publish-validate.ts";

export const DOCUMENTATION_FILES = ["README.md", "packages/setup/README.md"] as const;

export const REQUIRED_DOC_PATTERNS: Array<{ topic: string; pattern: RegExp }> = [
  { topic: "bunx install", pattern: /amadeus-setup\s+install|bunx\s+@amadeus-dlc\/setup\s+install/i },
  { topic: "upgrade command", pattern: /amadeus-setup\s+upgrade|upgrade/i },
  { topic: "bun required", pattern: /\bbun\b/i },
  { topic: "npx caveat", pattern: /npx|best-effort/i },
  { topic: "supported harnesses", pattern: /claude|codex|kiro/i },
  { topic: "target flag", pattern: /--target/i },
  { topic: "version flag", pattern: /--version/i },
  { topic: "yes flag", pattern: /--yes/i },
  { topic: "force flag", pattern: /--force/i },
  { topic: "manifest path", pattern: /amadeus\/\.installer\/amadeus-setup-manifest\.json|manifest/i },
  { topic: "manual release workflow", pattern: /workflow_dispatch|release-setup|GitHub Actions/i },
];

export const FORBIDDEN_DOC_PATTERNS: Array<{ term: string; pattern: RegExp }> = [
  { term: "amadeus-setup init", pattern: /amadeus-setup\s+init\b/i },
  { term: "init alias", pattern: /\binit\s+alias\b/i },
];

export type DocumentationConsistencyCheck = {
  ok: boolean;
  packageName: typeof EXPECTED_PACKAGE_NAME;
  bin: "amadeus-setup";
  checks: Array<{ file: string; status: "passed" | "failed"; reason?: string }>;
  missingTopics: string[];
  forbiddenHits: string[];
};

function checkFile(root: string, relativePath: string): { status: "passed" | "failed"; reason?: string; missingTopics: string[]; forbiddenHits: string[] } {
  const absolute = join(root, relativePath);
  if (!existsSync(absolute)) {
    return { status: "failed", reason: "file missing", missingTopics: REQUIRED_DOC_PATTERNS.map((item) => item.topic), forbiddenHits: [] };
  }

  const content = readFileSync(absolute, "utf-8");
  const missingTopics = REQUIRED_DOC_PATTERNS.filter((item) => !item.pattern.test(content)).map((item) => item.topic);
  const forbiddenHits = FORBIDDEN_DOC_PATTERNS.filter((item) => item.pattern.test(content)).map((item) => item.term);

  if (relativePath === "README.md") {
    if (!/amadeus-setup\s+install/i.test(content)) {
      if (!missingTopics.includes("bunx install")) {
        missingTopics.push("primary install path");
      }
    }
  }

  if (!content.includes(EXPECTED_PACKAGE_NAME) && relativePath === "packages/setup/README.md") {
    missingTopics.push("package name");
  }

  if (!content.includes("amadeus-setup")) {
    missingTopics.push("bin name");
  }

  const failed = missingTopics.length > 0 || forbiddenHits.length > 0;
  return {
    status: failed ? "failed" : "passed",
    reason: failed
      ? [
          missingTopics.length > 0 ? `missing topics: ${missingTopics.join(", ")}` : undefined,
          forbiddenHits.length > 0 ? `forbidden terms: ${forbiddenHits.join(", ")}` : undefined,
        ]
          .filter(Boolean)
          .join("; ")
      : undefined,
    missingTopics,
    forbiddenHits,
  };
}

export function runDocsConsistencyCheck(root = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..")): DocumentationConsistencyCheck {
  const checks = DOCUMENTATION_FILES.map((file) => {
    const result = checkFile(root, file);
    return {
      file,
      status: result.status,
      reason: result.reason,
    };
  });

  const allMissing = DOCUMENTATION_FILES.flatMap((file) => checkFile(root, file).missingTopics);
  const allForbidden = DOCUMENTATION_FILES.flatMap((file) => checkFile(root, file).forbiddenHits);

  return {
    ok: checks.every((check) => check.status === "passed"),
    packageName: EXPECTED_PACKAGE_NAME,
    bin: "amadeus-setup",
    checks,
    missingTopics: [...new Set(allMissing)],
    forbiddenHits: [...new Set(allForbidden)],
  };
}

function parseArg(argv: string[], flag: string): string | undefined {
  const index = argv.indexOf(flag);
  return index >= 0 ? argv[index + 1] : undefined;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const argv = process.argv.slice(2);
  const reportPath = parseArg(argv, "--report");
  const result = runDocsConsistencyCheck();

  if (reportPath) {
    mkdirSync(dirname(resolve(reportPath)), { recursive: true });
    writeFileSync(resolve(reportPath), `${JSON.stringify(result, null, 2)}\n`, "utf-8");
  }
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  process.exitCode = result.ok ? 0 : 1;
}
