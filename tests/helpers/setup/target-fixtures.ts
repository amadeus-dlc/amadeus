import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Harness } from "../../../packages/setup/src/cli/types.ts";
import { distributionFile, INSTALLER_MANIFEST_PATH, installerManifest } from "./fixtures.ts";

export type TargetFixtureKind =
  | "clean"
  | "manifest-installed"
  | "manual-or-unknown"
  | "partial"
  | "none"
  | "unsupported"
  | "ambiguous-harness";

const CODEX_SENTINELS = [".codex", ".agents", "AGENTS.md", "amadeus"] as const;
const KIRO_AMBIGUOUS_SENTINELS = [".kiro", "AGENTS.md", "amadeus"] as const;

export function seedTargetFixture(
  targetRoot: string,
  kind: TargetFixtureKind,
  input: { harness?: Harness; manifestVersion?: string } = {},
): void {
  switch (kind) {
    case "clean":
      return;
    case "none":
      return;
    case "unsupported":
      mkdirSync(join(targetRoot, "amadeus"), { recursive: true });
      return;
    case "partial": {
      const harness = input.harness ?? "codex";
      if (harness === "codex") {
        mkdirSync(join(targetRoot, ".codex"), { recursive: true });
      }
      return;
    }
    case "ambiguous-harness":
      for (const path of KIRO_AMBIGUOUS_SENTINELS) {
        const fullPath = join(targetRoot, path);
        if (path.endsWith("AGENTS.md")) {
          writeFileSync(fullPath, "agents");
        } else {
          mkdirSync(fullPath, { recursive: true });
        }
      }
      return;
    case "manual-or-unknown":
      for (const path of CODEX_SENTINELS) {
        const fullPath = join(targetRoot, path);
        if (path === "AGENTS.md") {
          writeFileSync(fullPath, "manual-agents");
        } else {
          mkdirSync(fullPath, { recursive: true });
        }
      }
      return;
    case "manifest-installed": {
      const harness = input.harness ?? "codex";
      const version = input.manifestVersion ?? "1.0.0";
      const agentsFile = distributionFile("AGENTS.md", { content: "agents" });
      mkdirSync(join(targetRoot, "amadeus", ".installer"), { recursive: true });
      writeFileSync(
        join(targetRoot, INSTALLER_MANIFEST_PATH),
        JSON.stringify(
          installerManifest({
            harness,
            distributionVersion: version,
            sourceTag: `v${version}`,
            files: [agentsFile],
          }),
          null,
          2,
        ),
      );
      writeFileSync(join(targetRoot, "AGENTS.md"), "agents");
      mkdirSync(join(targetRoot, ".codex"), { recursive: true });
      mkdirSync(join(targetRoot, ".agents"), { recursive: true });
      mkdirSync(join(targetRoot, "amadeus"), { recursive: true });
      if (harness === "codex") {
        writeFileSync(join(targetRoot, ".codex", "config.toml"), "config");
      }
      return;
    }
  }
}

export function codexReadyPaths(targetRoot: string): string[] {
  return CODEX_SENTINELS.map((path) => join(targetRoot, path));
}

export function kiroAmbiguousPaths(targetRoot: string): string[] {
  return KIRO_AMBIGUOUS_SENTINELS.map((path) => join(targetRoot, path));
}
