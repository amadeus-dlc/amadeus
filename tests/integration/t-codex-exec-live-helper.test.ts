import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, sep } from "node:path";
import {
  codexExecLiveRequirementsSkipReason,
  initializeCodexExecProject,
  setupCodexExecHome,
  setupCodexExecProject,
} from "../harness/codex-exec-live.ts";

interface CodexHarnessFixture {
  root: string;
  distributionDir: string;
  repositoryRoot: string;
}

function createCodexHarnessFixture(): CodexHarnessFixture {
  const root = mkdtempSync(join(tmpdir(), "codex-live-helper-fixture-"));
  const distributionDir = join(root, "dist", "codex");
  const repositoryRoot = join(root, "framework");
  mkdirSync(join(distributionDir, ".codex"), { recursive: true });
  mkdirSync(join(distributionDir, ".agents", "skills", "fixture"), { recursive: true });
  mkdirSync(join(repositoryRoot, "scripts"), { recursive: true });
  writeFileSync(join(distributionDir, ".codex", "config.toml.example"), "# config\n", "utf-8");
  writeFileSync(join(distributionDir, ".codex", "hooks.json.example"), "{}\n", "utf-8");
  writeFileSync(
    join(distributionDir, ".agents", "skills", "fixture", "SKILL.md"),
    "# Fixture\n",
    "utf-8",
  );
  writeFileSync(join(distributionDir, "AGENTS.md"), "# Fixture\n", "utf-8");
  writeFileSync(
    join(repositoryRoot, "scripts", "package.ts"),
    'process.stdout.write("[features]\\nfixture = true\\n");\n',
    "utf-8",
  );
  return { root, distributionDir, repositoryRoot };
}

function gitTrackedFiles(projectDir: string): string[] {
  const result = spawnSync("git", ["ls-files"], { cwd: projectDir, encoding: "utf-8" });
  if (result.status !== 0) throw new Error(`git ls-files failed: ${result.stderr}`);
  return result.stdout.split("\n").filter(Boolean);
}

describe("codex exec live E2E helper", () => {
  test("requirements probe uses the adapter's allow-listed PATH", () => {
    const binDir = mkdtempSync(join(tmpdir(), "codex-live-path-"));
    const codexBin = join(binDir, "codex");
    writeFileSync(codexBin, "#!/bin/sh\necho 'codex-cli 0.146.0'\n", "utf8");
    chmodSync(codexBin, 0o755);
    const input = {
      env: {
        AMADEUS_CODEX_EXEC_LIVE: "1",
        OPENAI_API_KEY: "fixture-key",
      },
      codexBin: "codex",
      distributionDir: process.cwd(),
    };
    try {
      expect(codexExecLiveRequirementsSkipReason({
        ...input,
        env: { ...input.env, PATH: binDir },
      })).toBeNull();
      expect(codexExecLiveRequirementsSkipReason({
        ...input,
        env: { ...input.env, PATH: "/path/that/does/not/exist" },
      })).toBe("codex >= 0.139.0 not found (AMADEUS_CODEX_BIN=codex)");
    } finally {
      rmSync(binDir, { recursive: true, force: true });
    }
  });

  test("canonical project setup activates the distribution without copying source auth", () => {
    const fixture = createCodexHarnessFixture();
    const project = setupCodexExecProject({
      prefix: "codex-exec-project-",
      distributionDir: fixture.distributionDir,
      repositoryRoot: fixture.repositoryRoot,
      model: "fixture-model",
      prepareProject: (projectDir) =>
        writeFileSync(join(projectDir, "prepared.txt"), "prepared\n", "utf-8"),
    });
    try {
      const trackedFiles = gitTrackedFiles(project.proj);
      expect(existsSync(join(project.proj, ".codex", "config.toml"))).toBe(true);
      expect(existsSync(join(project.proj, ".codex", "hooks.json"))).toBe(true);
      expect(existsSync(join(project.proj, "prepared.txt"))).toBe(true);
      expect(relative(project.proj, project.home).startsWith(`..${sep}`)).toBe(true);
      expect(trackedFiles).toContain("prepared.txt");
      expect(trackedFiles.some((file) => file.endsWith("auth.json"))).toBe(false);
      expect(existsSync(join(project.home, "auth.json"))).toBe(false);
      expect(readFileSync(join(project.home, "config.toml"), "utf-8")).toContain(
        'model = "fixture-model"',
      );
    } finally {
      project.cleanup();
      rmSync(fixture.root, { recursive: true, force: true });
    }
  });

  test("canonical project setup rolls back isolated home and distribution when trust fails", () => {
    const fixture = createCodexHarnessFixture();
    let scratchRoot: string | undefined;
    try {
      expect(() =>
        setupCodexExecProject({
          prefix: "codex-exec-failure-",
          distributionDir: fixture.distributionDir,
          repositoryRoot: join(fixture.root, "missing-framework"),
          model: "fixture-model",
          prepareProject: (projectDir) => {
            scratchRoot = dirname(projectDir);
            expect(existsSync(join(scratchRoot, "codex-home", "auth.json"))).toBe(false);
            expect(existsSync(join(projectDir, ".codex", "config.toml"))).toBe(true);
            writeFileSync(join(projectDir, "prepared.txt"), "prepared\n", "utf-8");
          },
        }),
      ).toThrow("trust emit failed");
      expect(scratchRoot).toBeDefined();
      if (scratchRoot === undefined) throw new Error("scratch root was not captured");
      expect(existsSync(scratchRoot)).toBe(false);
    } finally {
      rmSync(fixture.root, { recursive: true, force: true });
    }
  });

  test("external CODEX_HOME stays untracked and is deleted even when the workspace is kept", () => {
    const fixture = createCodexHarnessFixture();
    const workspace = mkdtempSync(join(tmpdir(), "codex-journey-workspace-"));
    const auth = setupCodexExecHome("codex-journey-auth-");
    const originalKeepTemp = process.env.AMADEUS_KEEP_TEMP;
    try {
      mkdirSync(join(workspace, ".home"), { recursive: true });
      writeFileSync(join(workspace, "project.txt"), "fixture\n", "utf-8");
      expect(() =>
        initializeCodexExecProject({
          projectDir: workspace,
          home: join(workspace, ".home"),
          repositoryRoot: fixture.repositoryRoot,
          model: "fixture-model",
        }),
      ).toThrow("CODEX_HOME must be outside the project");

      initializeCodexExecProject({
        projectDir: workspace,
        home: auth.home,
        repositoryRoot: fixture.repositoryRoot,
        model: "fixture-model",
      });
      expect(relative(workspace, auth.home).startsWith(`..${sep}`)).toBe(true);
      expect(gitTrackedFiles(workspace).some((file) => file.endsWith("auth.json"))).toBe(false);
      expect(readFileSync(join(auth.home, "config.toml"), "utf-8")).not.toContain(
        "model_provider",
      );

      process.env.AMADEUS_KEEP_TEMP = "1";
      auth.cleanup();
      expect(existsSync(auth.root)).toBe(false);
      expect(existsSync(workspace)).toBe(true);
    } finally {
      if (originalKeepTemp === undefined) delete process.env.AMADEUS_KEEP_TEMP;
      else process.env.AMADEUS_KEEP_TEMP = originalKeepTemp;
      auth.cleanup();
      rmSync(workspace, { recursive: true, force: true });
      rmSync(fixture.root, { recursive: true, force: true });
    }
  });
});
