import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveVersionFromTags } from "../domain/version-resolver.ts";
import { CANONICAL_SOURCE_REPO } from "../domain/source-types.ts";
import { runPackageDryRun } from "./package-dry-run.ts";

export const EXPECTED_PACKAGE_NAME = "@amadeus-dlc/setup";

export type RegistryManifest = {
  versions?: Record<string, { distTags?: Record<string, string> }>;
};

export type PublishValidationResult = {
  ok: boolean;
  packageName: string;
  packageVersion: string;
  sourceTag: string;
  npmDistTag: string;
  versionAlreadyPublished: boolean;
  checks: Array<{ name: string; status: "passed" | "failed"; reason?: string }>;
};

function parseSemverFromTag(tag: string): string | undefined {
  const match = /^v?(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(?:-([0-9A-Za-z.-]+))?$/.exec(tag);
  if (!match) {
    return undefined;
  }
  const stable = `${match[1]}.${match[2]}.${match[3]}`;
  return match[4] === undefined ? stable : `${stable}-${match[4]}`;
}

export function validatePublishRequest(options: {
  tag: string;
  npmDistTag: string;
  confirmPackage: string;
  dryRun: boolean;
  packageDir?: string;
  root?: string;
  registryManifest?: RegistryManifest;
  tags?: string[];
}): PublishValidationResult {
  const root = options.root ?? resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
  const packageDir = options.packageDir ?? "packages/setup";
  const setupRoot = join(root, packageDir);
  const packageJson = JSON.parse(readFileSync(join(setupRoot, "package.json"), "utf-8")) as {
    name?: string;
    version?: string;
  };
  const packageName = packageJson.name ?? EXPECTED_PACKAGE_NAME;
  const packageVersion = packageJson.version ?? "0.0.0";

  const tagResolved = resolveVersionFromTags(
    {
      requestedVersion: options.tag,
      sourceRepo: CANONICAL_SOURCE_REPO,
      allowExplicitPrerelease: true,
    },
    options.tags ?? [options.tag],
  );

  const sourceTag = tagResolved.ok ? tagResolved.value.sourceTag : options.tag;
  const distributionVersion = tagResolved.ok ? tagResolved.value.distributionVersion : (parseSemverFromTag(options.tag) ?? packageVersion);

  const dryRun = runPackageDryRun(root);
  const versionAlreadyPublished = Boolean(options.registryManifest?.versions?.[packageVersion]);

  const checks = [
    {
      name: "confirm package",
      status:
        options.dryRun || options.confirmPackage === EXPECTED_PACKAGE_NAME
          ? ("passed" as const)
          : ("failed" as const),
      reason:
        options.dryRun || options.confirmPackage === EXPECTED_PACKAGE_NAME
          ? undefined
          : `confirm_package must equal ${EXPECTED_PACKAGE_NAME}`,
    },
    {
      name: "package name",
      status: packageName === EXPECTED_PACKAGE_NAME ? ("passed" as const) : ("failed" as const),
      reason: packageName === EXPECTED_PACKAGE_NAME ? undefined : `package name must be ${EXPECTED_PACKAGE_NAME}`,
    },
    {
      name: "tag version alignment",
      status: packageVersion === distributionVersion ? ("passed" as const) : ("failed" as const),
      reason:
        packageVersion === distributionVersion
          ? undefined
          : `package version ${packageVersion} does not match tag version ${distributionVersion}`,
    },
    {
      name: "package dry-run",
      status: dryRun.ok ? ("passed" as const) : ("failed" as const),
      reason: dryRun.ok ? undefined : "package dry-run validation failed",
    },
    {
      name: "registry version conflict",
      status: versionAlreadyPublished ? ("failed" as const) : ("passed" as const),
      reason: versionAlreadyPublished ? `version ${packageVersion} already exists on npm` : undefined,
    },
    {
      name: "prerelease dist-tag",
      status:
        !sourceTag.includes("-") || options.npmDistTag !== "latest"
          ? ("passed" as const)
          : ("failed" as const),
      reason:
        !sourceTag.includes("-") || options.npmDistTag !== "latest"
          ? undefined
          : "prerelease tags cannot use npm_dist_tag=latest",
    },
  ];

  return {
    ok: checks.every((check) => check.status === "passed"),
    packageName,
    packageVersion,
    sourceTag,
    npmDistTag: options.npmDistTag,
    versionAlreadyPublished,
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
  const tag = parseArg(argv, "--tag");
  const npmDistTag = parseArg(argv, "--dist-tag") ?? "latest";
  const confirmPackage = parseArg(argv, "--confirm-package") ?? "";
  const dryRun = parseArg(argv, "--dry-run") !== "false";
  const packageDir = parseArg(argv, "--package-dir") ?? "packages/setup";
  const registryManifestPath = parseArg(argv, "--registry-manifest");

  if (!tag) {
    process.stderr.write("--tag is required\n");
    process.exit(1);
  }

  let registryManifest: RegistryManifest | undefined;
  if (registryManifestPath && existsSync(resolve(registryManifestPath))) {
    registryManifest = JSON.parse(readFileSync(resolve(registryManifestPath), "utf-8")) as RegistryManifest;
  }

  const result = validatePublishRequest({
    tag,
    npmDistTag,
    confirmPackage,
    dryRun,
    packageDir,
    registryManifest,
    tags: [tag],
  });

  if (reportPath) {
    mkdirSync(dirname(resolve(reportPath)), { recursive: true });
    writeFileSync(resolve(reportPath), `${JSON.stringify(result, null, 2)}\n`, "utf-8");
  }
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  process.exitCode = result.ok ? 0 : 1;
}
