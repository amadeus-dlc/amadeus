import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runPackageDryRun } from "./package-dry-run.ts";

export type ReleaseEvidence = {
  ok: boolean;
  packageName: string;
  packageVersion: string;
  sourceTag?: string;
  sbom: {
    schemaVersion: 1;
    format: "spdx-lite";
    components: Array<{ name: string; version: string; files: string[] }>;
  };
  provenance: {
    schemaVersion: 1;
    publisher: "github-actions";
    buildType: "https://docs.npmjs.com/generating-provenance-statements";
    attestationReady: boolean;
    publishCommand: "npm publish --tag <npm_dist_tag> --access public --provenance";
  };
};

export function generateReleaseEvidence(options: {
  root?: string;
  sourceTag?: string;
  includeSbom?: boolean;
  includeProvenance?: boolean;
} = {}): ReleaseEvidence {
  const root = options.root ?? resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
  const dryRun = runPackageDryRun(root);
  const includeSbom = options.includeSbom ?? true;
  const includeProvenance = options.includeProvenance ?? true;

  const sbom = includeSbom
    ? {
        schemaVersion: 1 as const,
        format: "spdx-lite" as const,
        components: [
          {
            name: dryRun.packageName,
            version: "from-package-json",
            files: dryRun.entries.map((entry) => entry.path),
          },
        ],
      }
    : {
        schemaVersion: 1 as const,
        format: "spdx-lite" as const,
        components: [],
      };

  const provenance = includeProvenance
    ? {
        schemaVersion: 1 as const,
        publisher: "github-actions" as const,
        buildType: "https://docs.npmjs.com/generating-provenance-statements" as const,
        attestationReady: dryRun.ok,
        publishCommand: "npm publish --tag <npm_dist_tag> --access public --provenance" as const,
      }
    : {
        schemaVersion: 1 as const,
        publisher: "github-actions" as const,
        buildType: "https://docs.npmjs.com/generating-provenance-statements" as const,
        attestationReady: false,
        publishCommand: "npm publish --tag <npm_dist_tag> --access public --provenance" as const,
      };

  return {
    ok: dryRun.ok && (includeSbom ? sbom.components.length > 0 : true) && (includeProvenance ? provenance.attestationReady : true),
    packageName: dryRun.packageName,
    packageVersion: "from-package-json",
    sourceTag: options.sourceTag,
    sbom,
    provenance,
  };
}

function parseArg(argv: string[], flag: string): string | undefined {
  const index = argv.indexOf(flag);
  return index >= 0 ? argv[index + 1] : undefined;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const argv = process.argv.slice(2);
  const reportPath = parseArg(argv, "--report");
  const sourceTag = parseArg(argv, "--tag");
  const includeSbom = argv.includes("--sbom");
  const includeProvenance = argv.includes("--provenance");

  const result = generateReleaseEvidence({
    sourceTag,
    includeSbom: includeSbom || (!includeSbom && !includeProvenance),
    includeProvenance: includeProvenance || (!includeSbom && !includeProvenance),
  });

  if (reportPath) {
    mkdirSync(dirname(resolve(reportPath)), { recursive: true });
    writeFileSync(resolve(reportPath), `${JSON.stringify(result, null, 2)}\n`, "utf-8");
  }
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  process.exitCode = result.ok ? 0 : 1;
}
