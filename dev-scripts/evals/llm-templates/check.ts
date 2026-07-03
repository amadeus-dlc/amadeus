#!/usr/bin/env bun

import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, cpSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createLlmProvider, isLlmProviderMode, shellQuote, type LlmProvider, type LlmProviderMode, type LlmRequest, type MockLlmCases } from "../llm-support/provider";

// この eval は amadeus-steering の E2E だった（examples 機構の廃止に伴い退役）。
// 現在は runner/provider のオプション解決を検証する `--mode ping` の共通ハーネスとしてだけ残す。
// 実際に呼び出す側は provider-options-check.ts と runner-options-check.ts。
type Mode = "ping";

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
const requiredSkills = [
  "amadeus-validator",
  "japanese-tech-writing",
];

function parseArgs(args: string[]): Options {
  const options: Options = {
    dryRun: false,
    keep: false,
    mode: "ping",
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
      if (value !== "ping") fail("--mode requires ping");
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

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

function ensureFile(path: string): void {
  if (!existsSync(path)) fail(`missing file: ${path}`);
}

function ensureDir(path: string): void {
  if (!existsSync(path)) mkdirSync(path, { recursive: true });
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

function pingPrompt(): string {
  return [
    "動作確認です。",
    "ファイルを作成せず、コマンドも実行しないでください。",
    "最後の返答は `pong` だけにしてください。",
  ].join("\n");
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
  return {
    ping: {
      message: "pong\n",
    },
  };
}

async function main(): Promise<void> {
  const options = parseArgs(Bun.argv.slice(2));
  const runner = resolveRunner(options.runner);
  if (options.provider === "real") ensureFile(runner);

  const workspace = createWorkspace(options);
  prepareWorkspace(workspace);
  const output = join(workspace, "last-message.md");
  const selectedPrompt = pingPrompt();
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
    const result = await runProvider(provider, {
      caseId: options.mode,
      outputPath: output,
      prompt: selectedPrompt,
      workspace,
    });
    assertPing(result.outputPath);
    console.log("llm ping eval: ok");
  } finally {
    if (!options.keep && !options.workspace) rmSync(workspace, { recursive: true, force: true });
  }
}

await main();
