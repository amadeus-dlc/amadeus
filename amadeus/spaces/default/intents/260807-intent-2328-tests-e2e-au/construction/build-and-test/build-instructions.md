# Build Instructions — 260807-intent-2328-tests-e2e-au

上流入力(consumes 全数): code-generation-plan（実装ステップの正本 — 対象面の導出元）、code-summary（builder/conductor 実測の一次転記元）

## ビルド手順

1. `bun install --frozen-lockfile`
2. `bun run build` — dist / self-install 面を再生成（**e2e tier の実行前提** — 共有ハーネス tests/harness/audit-records.ts は EVENT_HEADINGS を dist から import。run-tests は dist 不在で fail-closed: `tests/run-tests.ts:1010`）
3. build 後 `git status` で tracked 差分 = 意図した編集のみ

## 本 intent での対象面

変更は **tests/e2e/ の19ファイルのみ**（正本・dist 投影面への変更なし — writer 無改変 AC-1b）。build が必要なのは実行前提（dist 読み）のためであり、投影同期のためではない。

## 検証

- `bun run typecheck` / `bun run lint`（再接地 + build 後に exit 0 を実測済み）
- 再接地（base a5621236c → 6bef8206d の merge）後は dist 再生成が必須 — main 前進分（t485 が dist の新 export を参照）で typecheck が赤くなる事象を実測し、build で解消した
