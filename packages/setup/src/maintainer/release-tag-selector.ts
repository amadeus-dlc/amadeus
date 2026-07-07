import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { CANONICAL_SOURCE_REPO } from "../domain/source-types.ts";
import { resolveVersionFromTags } from "../domain/version-resolver.ts";

export type ReleaseTagSelection = {
  sourceRepo: typeof CANONICAL_SOURCE_REPO;
  sourceTag: string;
  distributionVersion: string;
  explicit: boolean;
  prerelease: boolean;
  ignoredTags: Array<{ tag: string; reason: string }>;
};

export type ReleaseTagSelectionResult =
  | { ok: true; value: ReleaseTagSelection }
  | { ok: false; reason: string; code: "invalid-dist-tag" | "tag-not-found" | "no-stable-version" };

function parseSemverPrerelease(tag: string): boolean {
  const match = /^v?(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(?:-([0-9A-Za-z.-]+))?$/.exec(tag);
  return match?.[4] !== undefined;
}

export function selectReleaseTag(options: {
  inputTag?: string;
  npmDistTag: string;
  tags: string[];
}): ReleaseTagSelectionResult {
  const explicit = options.inputTag !== undefined && options.inputTag.length > 0;
  const resolved = resolveVersionFromTags(
    {
      requestedVersion: options.inputTag,
      sourceRepo: CANONICAL_SOURCE_REPO,
      allowExplicitPrerelease: true,
    },
    options.tags,
  );

  if (!resolved.ok) {
    const code = resolved.error.code === "no-stable-version" ? "no-stable-version" : "tag-not-found";
    return { ok: false, reason: resolved.error.message, code };
  }

  const prerelease = parseSemverPrerelease(resolved.value.sourceTag);
  if (prerelease && options.npmDistTag === "latest") {
    return {
      ok: false,
      reason: "Prerelease tags cannot publish with npm_dist_tag=latest.",
      code: "invalid-dist-tag",
    };
  }

  return {
    ok: true,
    value: {
      sourceRepo: CANONICAL_SOURCE_REPO,
      sourceTag: resolved.value.sourceTag,
      distributionVersion: resolved.value.distributionVersion,
      explicit,
      prerelease,
      ignoredTags: resolved.value.ignoredTags.map((item) => ({ tag: item.tag, reason: item.reason })),
    },
  };
}

function parseArg(argv: string[], flag: string): string | undefined {
  const index = argv.indexOf(flag);
  return index >= 0 ? argv[index + 1] : undefined;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const argv = process.argv.slice(2);
  const inputTag = parseArg(argv, "--tag");
  const npmDistTag = parseArg(argv, "--npm-dist-tag") ?? "latest";
  const tagsFile = parseArg(argv, "--tags-file");
  const reportPath = parseArg(argv, "--report");

  let tags: string[] = [];
  if (tagsFile) {
    tags = readFileSync(resolve(tagsFile), "utf-8").split("\n").map((line) => line.trim()).filter(Boolean);
  } else {
    const proc = Bun.spawnSync(["git", "tag", "--list"], { stdout: "pipe" });
    if (proc.exitCode !== 0) {
      process.stderr.write("failed to list git tags\n");
      process.exit(1);
    }
    tags = proc.stdout.toString().split("\n").map((line) => line.trim()).filter(Boolean);
  }

  const result = selectReleaseTag({ inputTag, npmDistTag, tags });
  const payload = result.ok
    ? { ok: true, selection: result.value }
    : { ok: false, reason: result.reason, code: result.code };

  if (reportPath) {
    mkdirSync(dirname(resolve(reportPath)), { recursive: true });
    writeFileSync(resolve(reportPath), `${JSON.stringify(payload, null, 2)}\n`, "utf-8");
  }
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
  process.exitCode = result.ok ? 0 : 1;
}
