#!/usr/bin/env bun

import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, cpSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import { createLlmProvider, isLlmProviderMode, shellQuote, type LlmProvider, type LlmProviderMode, type LlmRequest, type MockLlmCases } from "../llm-support/provider";

type InitialE2eMode = "steering";
type E2eMode = InitialE2eMode | `${InitialE2eMode}-rerun`;
type Mode = "ping" | E2eMode | "all";

type ExpectedArtifacts = {
  mustExist: string[];
  mustNotExist: string[];
  mustRemainValid: string[];
};

type ExpectedMarkdownChanges = {
  created: string[];
  mayUpdate: string[];
  updated: string[];
};

type MarkdownSnapshot = Map<string, string>;
type FileSnapshot = Map<string, string | null>;

type E2eCase = {
  id: E2eMode;
  prompt: string;
  prepareGiven: (workspace: string) => void;
  givenMustRemainValid: string[];
  applyMock: (workspace: string) => void;
  expectedArtifacts: ExpectedArtifacts;
  expectedFileChanges: string[];
  expectedMarkdownChanges: ExpectedMarkdownChanges;
  assert?: (workspace: string) => void;
};

type Options = {
  dryRun: boolean;
  keep: boolean;
  mode: Mode;
  printCommand: boolean;
  provider: LlmProviderMode;
  runner: string;
  workspace?: string;
};

const root = resolve(import.meta.dir, "../../..");
const defaultCodexRunner = "dev-scripts/run-codex-corporate.sh";
const validator = ".agents/skills/amadeus-validator/validator/AmadeusValidator.ts";
const requiredSkills = [
  "amadeus-steering",
  "amadeus-validator",
  "japanese-tech-writing",
];
const initialE2eModes = ["steering"] as const;
const rerunE2eModes = initialE2eModes.map((mode) => `${mode}-rerun` as const);
const e2eModes = [...initialE2eModes, ...rerunE2eModes] as const;
const forbiddenSpecArtifacts = [
  "aidlc/spaces/default/spec.md",
  "aidlc/spaces/default/specs",
  ".kiro/specs",
  "openspec",
];
// amadeus-discovery は #369 で退役したため、steering layer が Discovery 成果物を作らないことを検証する。
const retiredDiscoveryArtifacts = [
  "aidlc/spaces/default/discoveries.md",
  "aidlc/spaces/default/discoveries",
];

function parseArgs(args: string[]): Options {
  const options: Options = {
    dryRun: false,
    keep: false,
    mode: "steering",
    printCommand: false,
    provider: providerModeFromEnvironment(),
    runner: process.env.AMADEUS_CODEX_RUNNER ?? defaultCodexRunner,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--dry-run") {
      options.dryRun = true;
    } else if (arg === "--keep") {
      options.keep = true;
    } else if (arg === "--print-command") {
      options.printCommand = true;
    } else if (arg === "--provider") {
      const value = args[index + 1];
      if (!isLlmProviderMode(value)) fail("--provider requires mock or real");
      options.provider = value;
      index += 1;
    } else if (arg === "--mode") {
      const value = args[index + 1];
      if (!isMode(value)) fail(`--mode requires ping, all, or one of: ${e2eModes.join(", ")}`);
      options.mode = value;
      index += 1;
    } else if (arg === "--workspace") {
      const value = args[index + 1];
      if (!value) fail("--workspace requires a path");
      options.workspace = resolve(value);
      index += 1;
    } else if (arg === "--runner") {
      const value = args[index + 1];
      if (!value) fail("--runner requires a path");
      options.runner = value;
      index += 1;
    } else {
      fail(`unknown argument: ${arg}`);
    }
  }

  return options;
}

function providerModeFromEnvironment(): LlmProviderMode {
  const value = process.env.AMADEUS_LLM_PROVIDER;
  if (value === undefined) return "mock";
  if (isLlmProviderMode(value)) return value;
  fail("AMADEUS_LLM_PROVIDER requires mock or real");
}

function resolveRunner(path: string): string {
  return resolve(root, path);
}

function isMode(value: string | undefined): value is Mode {
  return value === "ping" ||
    isE2eMode(value) ||
    value === "all";
}

function isE2eMode(value: string | undefined): value is E2eMode {
  return e2eModes.includes(value as E2eMode);
}

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

function run(command: string[], cwd: string): string {
  const result = Bun.spawnSync(command, {
    cwd,
    stdout: "pipe",
    stderr: "pipe",
  });

  const stdout = new TextDecoder().decode(result.stdout);
  const stderr = new TextDecoder().decode(result.stderr);

  if (result.exitCode !== 0) {
    fail([
      `command failed: ${command.join(" ")}`,
      "stdout:",
      stdout,
      "stderr:",
      stderr,
    ].join("\n"));
  }

  return stdout;
}

function ensureFile(path: string): void {
  if (!existsSync(path)) fail(`missing file: ${path}`);
}

function ensureMissing(path: string): void {
  if (existsSync(path)) fail(`unexpected file: ${path}`);
}

function ensureDir(path: string): void {
  if (!existsSync(path)) mkdirSync(path, { recursive: true });
}

function listFiles(path: string): string[] {
  return readdirSync(path).flatMap((entry) => {
    const next = join(path, entry);
    return statSync(next).isDirectory() ? listFiles(next) : [next];
  });
}

function listAmadeusFiles(workspace: string): string[] {
  const amadeus = join(workspace, "aidlc");
  if (!existsSync(amadeus)) return [];
  return listFiles(amadeus).map((file) => relative(workspace, file)).sort();
}

function listAmadeusMarkdownFiles(workspace: string): string[] {
  return listAmadeusFiles(workspace).filter((file) => file.endsWith(".md"));
}

function snapshotMarkdown(workspace: string): MarkdownSnapshot {
  return new Map(listAmadeusMarkdownFiles(workspace).map((file) => {
    const path = join(workspace, file);
    const stat = statSync(path);
    return [file, `${stat.size}:${stat.mtimeMs}:${readFileSync(path, "utf8")}`];
  }));
}

function snapshotFiles(workspace: string, files: string[]): FileSnapshot {
  return new Map(unique(files).map((file) => {
    const path = join(workspace, file);
    if (!existsSync(path)) return [file, null];
    const stat = statSync(path);
    return [file, `${stat.size}:${stat.mtimeMs}:${readFileSync(path, "utf8")}`];
  }));
}

function unique(files: string[]): string[] {
  return [...new Set(files)].sort();
}

function replaceInTree(path: string, replacements: Record<string, string>): void {
  for (const file of listFiles(path)) {
    replaceInFile(file, replacements);
  }
}

function replaceInFile(file: string, replacements: Record<string, string>): void {
    let content = readFileSync(file, "utf8");
    for (const [from, to] of Object.entries(replacements)) {
      content = content.replaceAll(from, to);
    }
    writeFileSync(file, content);
}

function createWorkspace(options: Options): string {
  const workspace = options.workspace ?? mkdtempSync(join(tmpdir(), "amadeus-llm-template-eval-"));
  ensureDir(workspace);
  return workspace;
}

function prepareWorkspace(workspace: string): void {
  ensureDir(join(workspace, ".agents/skills"));
  ensureDir(join(workspace, ".agents/rules"));

  for (const skill of requiredSkills) {
    const source = join(root, ".agents/skills", skill);
    const target = join(workspace, ".agents/skills", skill);
    ensureFile(join(source, "SKILL.md"));
    cpSync(source, target, { recursive: true });
  }

  cpSync(join(root, ".agents/rules"), join(workspace, ".agents/rules"), { recursive: true });

  writeFileSync(
    join(workspace, "AGENTS.md"),
    [
      "# AGENTS.md",
      "",
      "- 必ず日本語で返答すること。",
      "- `.agents/rules/**/*.md` を守ること。",
      "- 日本語を書くときは `japanese-tech-writing` skill を使うこと。",
      "- Amadeus 成果物を作る場合は、対象 skill の同梱テンプレートを使うこと。",
      "",
    ].join("\n"),
  );
}

function prepareSteeringFixture(workspace: string): void {
  const source = join(root, ".agents/skills/amadeus-steering/templates/space");
  const target = join(workspace, "aidlc/spaces/default");
  ensureFile(join(source, "README.md"));
  cpSync(source, target, { recursive: true });
  rmSync(join(target, "README.md"), { force: true });
  replaceInTree(target, {
    "<product-name>": "図書貸出セルフサービス",
  });
}

function steeringPrompt(): string {
  return [
    "amadeus-steering を使ってください。",
    "",
    "空の workspace に Amadeus の Space（aidlc/spaces/default/）を作成してください。",
    "",
    "題材:",
    "- プロダクト名: 図書貸出セルフサービス",
    "- 主目的: 利用者が図書館カウンターに並ばずに貸出と返却を進められる",
    "- 主なアクター: 利用者, 図書館職員",
    "- 外部システム: 図書管理システム",
    "- 主要領域: 貸出, 返却, 利用者通知",
    "",
    "制約:",
    "- 質問せずに続行してください。",
    "- `aidlc/` 配下だけを作成してください。",
    "- git commit はしないでください。",
    "- 作成後に `bun run .agents/skills/amadeus-validator/validator/AmadeusValidator.ts .` を実行し、結果を要約してください。",
  ].join("\n");
}

function pingPrompt(): string {
  return [
    "動作確認です。",
    "ファイルを作成せず、コマンドも実行しないでください。",
    "最後の返答は `pong` だけにしてください。",
  ].join("\n");
}

function rerunPrompt(basePrompt: string): string {
  return [
    basePrompt,
    "",
    "再実行条件:",
    "- 既存成果物がすでにある状態で再実行してください。",
    "- 不足があれば補完し、既存内容と矛盾する重複成果物は作らないでください。",
    "- 実装、CI は作らないでください。",
  ].join("\n");
}

function promptFor(mode: Mode): string {
  if (mode === "ping") return pingPrompt();
  if (isE2eMode(mode)) return e2eCase(mode).prompt;
  fail("all mode does not have a single prompt");
}

function steeringArtifacts(): string[] {
  return [
    "aidlc/spaces/default/memory/org.md",
    "aidlc/spaces/default/memory/team.md",
    "aidlc/spaces/default/memory/project.md",
    "aidlc/spaces/default/knowledge/glossary.md",
    "aidlc/spaces/default/knowledge/actors.md",
    "aidlc/spaces/default/knowledge/external-systems.md",
    "aidlc/spaces/default/knowledge/background.md",
    "aidlc/spaces/default/knowledge/domain-map.md",
    "aidlc/spaces/default/knowledge/context-map.md",
    "aidlc/spaces/default/intents/intents.json",
    "aidlc/spaces/default/intents/intents.md",
  ];
}

function steeringMarkdownArtifacts(): string[] {
  return markdownOnly(steeringArtifacts());
}

function markdownOnly(files: string[]): string[] {
  return files.filter((file) => file.endsWith(".md"));
}

function expectedArtifacts(mustExist: string[], mustRemainValid: string[]): ExpectedArtifacts {
  return {
    mustExist: unique(mustExist),
    mustNotExist: [
      ...forbiddenSpecArtifacts,
      ...retiredDiscoveryArtifacts,
    ],
    mustRemainValid,
  };
}

function expectedMarkdownChanges(created: string[], updated: string[], mayUpdate: string[] = []): ExpectedMarkdownChanges {
  return {
    created: unique(markdownOnly(created)),
    mayUpdate: unique(markdownOnly(mayUpdate)),
    updated: unique(markdownOnly(updated)),
  };
}

function e2eCase(mode: E2eMode): E2eCase {
  const baseCases: Record<InitialE2eMode, E2eCase> = {
    steering: {
      id: "steering",
      prompt: steeringPrompt(),
      prepareGiven: () => {},
      givenMustRemainValid: [],
      applyMock: prepareSteeringFixture,
      expectedArtifacts: expectedArtifacts(steeringArtifacts(), ["."]),
      expectedFileChanges: [],
      expectedMarkdownChanges: expectedMarkdownChanges(steeringMarkdownArtifacts(), []),
    },
  };

  if (!mode.endsWith("-rerun")) return baseCases[mode as InitialE2eMode];

  const baseMode = mode.replace("-rerun", "") as InitialE2eMode;
  const baseCase = baseCases[baseMode];
  return {
    ...baseCase,
    id: mode,
    prompt: rerunPrompt(baseCase.prompt),
    prepareGiven: (workspace) => {
      baseCase.prepareGiven(workspace);
      baseCase.applyMock(workspace);
    },
    givenMustRemainValid: baseCase.expectedArtifacts.mustRemainValid,
    expectedFileChanges: [],
    expectedMarkdownChanges: expectedMarkdownChanges([], [], [
      ...baseCase.expectedMarkdownChanges.created,
      ...baseCase.expectedMarkdownChanges.updated,
    ]),
  };
}

function prepareDryRun(workspace: string, mode: Mode): void {
  if (mode === "all") {
    for (const targetMode of initialE2eModes) {
      const modeWorkspace = join(workspace, targetMode);
      ensureDir(modeWorkspace);
      prepareWorkspace(modeWorkspace);
      prepareE2eGiven(modeWorkspace, e2eCase(targetMode));
    }
  } else if (isE2eMode(mode)) {
    prepareE2eGiven(workspace, e2eCase(mode));
  }
}

function prepareE2eGiven(workspace: string, testCase: E2eCase): void {
  testCase.prepareGiven(workspace);
  assertValidTargets(workspace, testCase.givenMustRemainValid);
}

function assertE2eCase(workspace: string, testCase: E2eCase): void {
  assertArtifacts(workspace, testCase.expectedArtifacts);
  testCase.assert?.(workspace);
}

function assertFileChanges(before: FileSnapshot, after: FileSnapshot, expectedFiles: string[]): void {
  const missing = unique(expectedFiles).filter((file) => after.get(file) === null);
  const unchanged = unique(expectedFiles).filter((file) => {
    const previous = before.get(file);
    const current = after.get(file);
    return current !== null && current === previous;
  });

  if (missing.length > 0 || unchanged.length > 0) {
    fail([
      "workspace file change coverage mismatch",
      `missing changed files: ${missing.length === 0 ? "<none>" : missing.join(", ")}`,
      `unchanged files: ${unchanged.length === 0 ? "<none>" : unchanged.join(", ")}`,
    ].join("\n"));
  }
}

function assertMarkdownChanges(before: MarkdownSnapshot, after: MarkdownSnapshot, expected: ExpectedMarkdownChanges): void {
  const actualCreated = [...after.keys()].filter((file) => !before.has(file)).sort();
  const actualUpdated = [...after.keys()].filter((file) => {
    const previous = before.get(file);
    return previous !== undefined && previous !== after.get(file);
  }).sort();
  const expectedCreated = unique(expected.created);
  const allowedUpdated = unique([...expected.updated, ...expected.mayUpdate]);
  const expectedUpdated = unique(expected.updated);

  const missingCreated = expectedCreated.filter((file) => !actualCreated.includes(file));
  const unexpectedCreated = actualCreated.filter((file) => !expectedCreated.includes(file));
  const missingUpdated = expectedUpdated.filter((file) => !actualUpdated.includes(file));
  const unexpectedUpdated = actualUpdated.filter((file) => !allowedUpdated.includes(file));

  if (missingCreated.length > 0 || unexpectedCreated.length > 0 || missingUpdated.length > 0 || unexpectedUpdated.length > 0) {
    fail([
      "markdown change coverage mismatch",
      `missing created: ${missingCreated.length === 0 ? "<none>" : missingCreated.join(", ")}`,
      `unexpected created: ${unexpectedCreated.length === 0 ? "<none>" : unexpectedCreated.join(", ")}`,
      `missing updated: ${missingUpdated.length === 0 ? "<none>" : missingUpdated.join(", ")}`,
      `unexpected updated: ${unexpectedUpdated.length === 0 ? "<none>" : unexpectedUpdated.join(", ")}`,
    ].join("\n"));
  }
}

function assertArtifacts(workspace: string, expectedArtifacts: ExpectedArtifacts): void {
  for (const file of expectedArtifacts.mustExist) {
    ensureFile(join(workspace, file));
  }
  for (const file of expectedArtifacts.mustNotExist) {
    ensureMissing(join(workspace, file));
  }

  const expected = unique(expectedArtifacts.mustExist);
  const actual = listAmadeusFiles(workspace);
  const missing = expected.filter((file) => !actual.includes(file));
  const unexpected = actual.filter((file) => !expected.includes(file));
  const specArtifacts = actual.filter(isSpecArtifact);

  if (missing.length > 0 || unexpected.length > 0 || specArtifacts.length > 0) {
    fail([
      "artifact manifest mismatch",
      `missing: ${missing.length === 0 ? "<none>" : missing.join(", ")}`,
      `unexpected: ${unexpected.length === 0 ? "<none>" : unexpected.join(", ")}`,
      `spec artifacts: ${specArtifacts.length === 0 ? "<none>" : specArtifacts.join(", ")}`,
    ].join("\n"));
  }

  assertValidTargets(workspace, expectedArtifacts.mustRemainValid);
}

function isSpecArtifact(file: string): boolean {
  return file.split(/[\\/]/).some((segment) => segment === "spec" || segment === "specs");
}

function assertValidTargets(workspace: string, targets: string[]): void {
  for (const target of targets) {
    if (target === ".") {
      run(["bun", "run", validator, "."], workspace);
    } else {
      run(["bun", "run", validator, ".", target], workspace);
    }
  }
}

function assertPing(output: string): void {
  const message = readFileSync(output, "utf8").trim();
  if (message !== "pong") {
    fail(`ping response must be exactly "pong", but was: ${JSON.stringify(message)}`);
  }
}

async function runProvider(provider: LlmProvider, request: LlmRequest) {
  try {
    return await provider.run(request);
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
  }
}

function mockCases(): MockLlmCases {
  const cases: MockLlmCases = {
    ping: {
      message: "pong\n",
    },
  };

  for (const mode of e2eModes) {
    const testCase = e2eCase(mode);
    cases[mode] = {
      apply: (request) => testCase.applyMock(request.workspace),
      message: `${mode} 成果物を作成または更新しました。\n`,
    };
  }

  return cases;
}

async function runE2e(provider: LlmProvider, workspace: string, testCase: E2eCase): Promise<void> {
  prepareE2eGiven(workspace, testCase);
  const beforeFiles = snapshotFiles(workspace, testCase.expectedFileChanges);
  const beforeMarkdown = snapshotMarkdown(workspace);
  const result = await runProvider(provider, {
    caseId: testCase.id,
    outputPath: join(workspace, "last-message.md"),
    prompt: testCase.prompt,
    workspace,
  });
  const afterFiles = snapshotFiles(workspace, testCase.expectedFileChanges);
  const afterMarkdown = snapshotMarkdown(workspace);
  assertE2eCase(workspace, testCase);
  assertFileChanges(beforeFiles, afterFiles, testCase.expectedFileChanges);
  assertMarkdownChanges(beforeMarkdown, afterMarkdown, testCase.expectedMarkdownChanges);
  ensureFile(result.outputPath);
}

async function main(): Promise<void> {
  const options = parseArgs(Bun.argv.slice(2));
  const runner = resolveRunner(options.runner);
  if (options.provider === "real") ensureFile(runner);
  ensureFile(join(root, validator));

  const workspace = createWorkspace(options);
  prepareWorkspace(workspace);
  const output = join(workspace, "last-message.md");
  const selectedPrompt = options.mode === "all" ? "" : promptFor(options.mode);
  const provider = createLlmProvider({
    mockCases: mockCases(),
    mode: options.provider,
    root,
    runner: options.runner,
  });

  if (options.printCommand) {
    const command = provider.previewCommand({
      caseId: options.mode,
      outputPath: output,
      prompt: selectedPrompt,
      workspace,
    }).map(shellQuote).join(" ");
    console.log(command);
    console.log(`workspace: ${workspace}`);
    console.log(`provider: ${provider.describe()}`);
    return;
  }

  if (options.dryRun) {
    prepareDryRun(workspace, options.mode);
    console.log(`llm template eval dry-run: ok`);
    console.log(`mode: ${options.mode}`);
    console.log(`workspace: ${workspace}`);
    console.log(`provider: ${provider.describe()}`);
    console.log(`runner: ${runner}`);
    console.log(`codex home: ${process.env.CODEX_HOME ?? "<set by selected runner>"}`);
    if (!options.keep && !options.workspace) rmSync(workspace, { recursive: true, force: true });
    return;
  }

  try {
    console.log(`workspace: ${workspace}`);
    console.log(`mode: ${options.mode}`);
    console.log(`provider: ${provider.describe()}`);
    if (options.mode === "all") {
      for (const mode of initialE2eModes) {
        const modeWorkspace = join(workspace, mode);
        ensureDir(modeWorkspace);
        prepareWorkspace(modeWorkspace);
        console.log(`mode workspace: ${modeWorkspace}`);
        await runE2e(provider, modeWorkspace, e2eCase(mode));
        console.log(`llm ${mode} eval: ok`);
      }
      console.log("llm template eval: ok");
    } else if (options.mode === "ping") {
      const result = await runProvider(provider, {
        caseId: options.mode,
        outputPath: output,
        prompt: selectedPrompt,
        workspace,
      });
      assertPing(result.outputPath);
      console.log("llm ping eval: ok");
    } else {
      await runE2e(provider, workspace, e2eCase(options.mode));
      console.log(`llm ${options.mode} eval: ok`);
      console.log("llm template eval: ok");
    }
  } finally {
    if (!options.keep && !options.workspace) rmSync(workspace, { recursive: true, force: true });
  }
}

await main();
