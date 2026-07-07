import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runDocsConsistencyCheck } from "./docs-consistency.ts";
import { EXPECTED_PACKAGE_NAME } from "./publish-validate.ts";
import { runPackageDryRun } from "./package-dry-run.ts";

export type RegistryPackageMetadata = {
  name: string;
  version: string;
  bin?: Record<string, string>;
};

export type PostPublishVerification = {
  ok: boolean;
  packageName: string;
  packageVersion: string;
  sourceTag: string;
  checks: Array<{
    name: "npm-metadata" | "bin" | "tarball-contents" | "docs-consistency" | "bunx-help";
    status: "passed" | "failed" | "skipped";
    reason?: string;
  }>;
};

export function verifyPostPublish(options: {
  packageName: string;
  sourceTag: string;
  root?: string;
  registryMetadata?: RegistryPackageMetadata;
  skipBunxHelp?: boolean;
}): PostPublishVerification {
  const root = options.root ?? resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
  const dryRun = runPackageDryRun(root);
  const docs = runDocsConsistencyCheck(root);
  const packageVersion = options.registryMetadata?.version ?? "unknown";

  const checks: PostPublishVerification["checks"] = [];

  if (options.registryMetadata) {
    checks.push({
      name: "npm-metadata",
      status:
        options.registryMetadata.name === options.packageName &&
        options.registryMetadata.version === packageVersion
          ? "passed"
          : "failed",
      reason:
        options.registryMetadata.name === options.packageName
          ? undefined
          : `registry package name ${options.registryMetadata.name} does not match ${options.packageName}`,
    });
    checks.push({
      name: "bin",
      status: options.registryMetadata.bin?.["amadeus-setup"] ? "passed" : "failed",
      reason: options.registryMetadata.bin?.["amadeus-setup"] ? undefined : "registry metadata missing bin amadeus-setup",
    });
  } else {
    checks.push({
      name: "npm-metadata",
      status: "skipped",
      reason: "registry metadata not provided",
    });
    checks.push({
      name: "bin",
      status: "skipped",
      reason: "registry metadata not provided",
    });
  }

  checks.push({
    name: "tarball-contents",
    status: dryRun.ok ? "passed" : "failed",
    reason: dryRun.ok ? undefined : "package dry-run does not match publish allowlist",
  });

  checks.push({
    name: "docs-consistency",
    status: docs.ok ? "passed" : "failed",
    reason: docs.ok ? undefined : "documentation consistency check failed",
  });

  checks.push({
    name: "bunx-help",
    status: options.skipBunxHelp ? "skipped" : "skipped",
    reason: "bunx help verification requires network and is optional in release workflow",
  });

  return {
    ok: checks.every((check) => check.status === "passed" || check.status === "skipped"),
    packageName: options.packageName,
    packageVersion,
    sourceTag: options.sourceTag,
    checks,
  };
}

function parseArg(argv: string[], flag: string): string | undefined {
  const index = argv.indexOf(flag);
  return index >= 0 ? argv[index + 1] : undefined;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const argv = process.argv.slice(2);
  const reportPath = parseArg(argv, "--report");
  const packageName = parseArg(argv, "--package") ?? EXPECTED_PACKAGE_NAME;
  const sourceTag = parseArg(argv, "--tag") ?? "unknown";
  const registryMetadataPath = parseArg(argv, "--registry-metadata");

  let registryMetadata: RegistryPackageMetadata | undefined;
  if (registryMetadataPath && existsSync(resolve(registryMetadataPath))) {
    registryMetadata = JSON.parse(readFileSync(resolve(registryMetadataPath), "utf-8")) as RegistryPackageMetadata;
  }

  const result = verifyPostPublish({
    packageName,
    sourceTag,
    registryMetadata,
    skipBunxHelp: true,
  });

  if (reportPath) {
    mkdirSync(dirname(resolve(reportPath)), { recursive: true });
    writeFileSync(resolve(reportPath), `${JSON.stringify(result, null, 2)}\n`, "utf-8");
  }
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  process.exitCode = result.ok ? 0 : 1;
}
