#!/usr/bin/env bun

// dev-scripts/data/model-overrides.json（overlay 宣言）に基づき、宣言対象 agent の
// `.agents/amadeus/agents/<name>.md` frontmatter modelOverride 行を書き換える
// （Issue #554 FR-2.1）。overlay は本リポジトリの開発用設定であり配布物には
// 含めない（FR-1.3）。
//
// base（適用前の実値）は初回 apply が記録し（bootstrap）、以降は
// `--accept-upstream-base` の明示操作だけが更新する（BR-10 / BR-12）。実値が
// base にも管理値集合（宣言モデル ∪ 宣言済み fallback 先）にも一致しない場合、
// 上流変更または手編集の可能性があるため、自動更新せず非ゼロ終了で拒否する。
//
// 使い方:
//   bun run dev-scripts/apply-model-overrides.ts [root] [--check]
//   bun run dev-scripts/apply-model-overrides.ts [root] --use-fallback --reason "<text>"
//   bun run dev-scripts/apply-model-overrides.ts [root] --accept-upstream-base

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

type AgentOverlayEntry = {
  model: string;
  base?: string;
  fallbackApplied?: { to: string; reason: string };
};

type Overlay = {
  agents: Record<string, AgentOverlayEntry>;
  fallbacks: Record<string, string>;
};

type ApplyOptions = {
  checkOnly?: boolean;
  useFallback?: boolean;
  reason?: string;
  acceptUpstreamBase?: boolean;
};

type ApplyResult = {
  issues: string[];
  applied: string[];
};

type AgentPlan = {
  name: string;
  filePath: string;
  content: string;
  target: string;
  baseUpdate?: string;
};

const OVERLAY_RELATIVE_PATH = "dev-scripts/data/model-overrides.json";
const AGENTS_RELATIVE_DIR = ".agents/amadeus/agents";
const MODEL_OVERRIDE_LINE = /^modelOverride:\s*(.+)$/m;

function overlayPathFor(root: string): string {
  return join(root, OVERLAY_RELATIVE_PATH);
}

function agentFilePathFor(root: string, name: string): string {
  return join(root, AGENTS_RELATIVE_DIR, `${name}.md`);
}

function loadOverlay(root: string): Overlay {
  const path = overlayPathFor(root);
  if (!existsSync(path)) {
    throw new Error(`model overlay 設定が見つかりません: ${path}`);
  }
  return JSON.parse(readFileSync(path, "utf8")) as Overlay;
}

function saveOverlay(root: string, overlay: Overlay): void {
  writeFileSync(overlayPathFor(root), `${JSON.stringify(overlay, null, 2)}\n`);
}

export function readModelOverrideLine(content: string): string {
  const match = content.match(MODEL_OVERRIDE_LINE);
  if (!match) throw new Error("modelOverride 行が見つかりません");
  return match[1].trim();
}

export function setModelOverrideLine(content: string, value: string): string {
  if (!MODEL_OVERRIDE_LINE.test(content)) throw new Error("modelOverride 行が見つかりません");
  return content.replace(MODEL_OVERRIDE_LINE, `modelOverride: ${value}`);
}

function managedValues(entry: AgentOverlayEntry, fallbacks: Record<string, string>): Set<string> {
  const fallbackTarget = fallbacks[entry.model];
  return new Set(fallbackTarget ? [entry.model, fallbackTarget] : [entry.model]);
}

// 1 agent 分の適用計画を作る。base の記録・drift 判定・fallback 先解決を検証まで
// 済ませ、ファイル書き込みは行わない（Phase 1: 検証。呼び出し側の Phase 2 で
// まとめて書き込む — FR-1.4 の「宣言・base 記録・書き換えは同一実行内で不可分」
// を、1 件でも拒否があれば何も書き換えない形で満たす）。
function planAgent(root: string, name: string, entry: AgentOverlayEntry, overlay: Overlay, options: ApplyOptions): AgentPlan {
  const filePath = agentFilePathFor(root, name);
  const content = readFileSync(filePath, "utf8");
  const actual = readModelOverrideLine(content);
  const managed = managedValues(entry, overlay.fallbacks);

  let baseUpdate: string | undefined;
  if (entry.base === undefined) {
    // Bootstrap (base 未記録 = apply がこの agent に対して一度も成功していない
    // 唯一の状態、FR-1.4): 現在の実値を無条件に base として記録する。実値が
    // たまたま管理値集合と一致する場合（例: 宣言済み fallback 先が元々の値と
    // 同じ）でも、base 未記録は「まだ一度も適用していない」ことの証拠であり、
    // その実値以外に元の値を知る手段はない。
    baseUpdate = actual;
  } else if (actual !== entry.base && !managed.has(actual)) {
    if (!options.acceptUpstreamBase) {
      throw new Error(
        `${name}: 実値（modelOverride=${actual}）が base（${entry.base}）にも管理値集合にも一致しません。` +
          "先に `npm run parity:check`（または `models:check`）で乖離を確認し、上流変更を受け入れる場合は" +
          " `--accept-upstream-base` を指定してください。",
      );
    }
    baseUpdate = actual;
  }

  if (options.useFallback) {
    const fallbackTarget = overlay.fallbacks[entry.model];
    if (!fallbackTarget) throw new Error(`${name}: fallback 先が宣言されていません（fallbacks.${entry.model}）`);
    return { name, filePath, content, target: fallbackTarget, baseUpdate };
  }
  return { name, filePath, content, target: entry.model, baseUpdate };
}

export function applyModelOverrides(root: string, options: ApplyOptions = {}): ApplyResult {
  const overlay = loadOverlay(root);

  if (options.useFallback && !(options.reason ?? "").trim()) {
    throw new Error('--use-fallback には --reason "<text>" が必須です');
  }

  if (options.checkOnly) {
    const issues: string[] = [];
    for (const [name, entry] of Object.entries(overlay.agents)) {
      const actual = readModelOverrideLine(readFileSync(agentFilePathFor(root, name), "utf8"));
      const expected = entry.fallbackApplied ? entry.fallbackApplied.to : entry.model;
      if (actual !== expected) {
        issues.push(`${name}: modelOverride=${actual} は宣言値 ${expected} と一致しません`);
      }
    }
    return { issues, applied: [] };
  }

  // Phase 1: 全 agent を検証する。1 件でも拒否があれば、どのファイルも書き換えない。
  const plans = Object.entries(overlay.agents).map(([name, entry]) => planAgent(root, name, entry, overlay, options));

  // Phase 2: 検証済みの計画をまとめて適用する。
  const applied: string[] = [];
  for (const plan of plans) {
    writeFileSync(plan.filePath, setModelOverrideLine(plan.content, plan.target));
    applied.push(plan.name);
    const entry = overlay.agents[plan.name];
    if (plan.baseUpdate !== undefined) entry.base = plan.baseUpdate;
    if (options.useFallback) {
      entry.fallbackApplied = { to: plan.target, reason: options.reason as string };
    } else {
      delete entry.fallbackApplied;
    }
  }
  saveOverlay(root, overlay);

  return { issues: [], applied };
}

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

function parseArgs(argv: string[]): { root: string; options: ApplyOptions } {
  let root = process.cwd();
  const options: ApplyOptions = {};
  const positional: string[] = [];
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--check") options.checkOnly = true;
    else if (arg === "--use-fallback") options.useFallback = true;
    else if (arg === "--accept-upstream-base") options.acceptUpstreamBase = true;
    else if (arg === "--reason") {
      options.reason = argv[index + 1];
      index += 1;
    } else if (arg.startsWith("--")) {
      fail(`unknown flag: ${arg}`);
    } else {
      positional.push(arg);
    }
  }
  if (positional.length > 0) root = resolve(positional[0]);
  return { root, options };
}

function main(): void {
  const { root, options } = parseArgs(process.argv.slice(2));
  try {
    const result = applyModelOverrides(root, options);
    if (options.checkOnly) {
      if (result.issues.length > 0) {
        console.error(`model overlay check: ${result.issues.length} 件の不一致`);
        for (const issue of result.issues) console.error(`- ${issue}`);
        process.exit(1);
      }
      console.log("model overlay check: ok");
      return;
    }
    console.log(
      result.applied.length > 0
        ? `model overlay apply: ok（適用: ${result.applied.join(", ")}）`
        : "model overlay apply: ok（適用対象なし）",
    );
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
  }
}

if (import.meta.main) main();
