# Build Test Results — metrics 可視化

上流入力(consumes 全数): code-generation-plan.md, code-summary.md

両 unit の code-generation-plan.md(実施計画・検証手順)と code-summary.md(変更ファイル・検証結果)を検証対象の定義として消費する。

## 実測値(数値は全てコマンド出力からの転記)

- bun test t298: 45 pass / 0 fail(unit 27・integration 18)
- 既存 t221/t230/t231: 68 pass / 0 fail
- tests/run-tests.sh --ci(再実行): RESULT: PASS、exit 0、Test files 561
- bun run typecheck: exit 0 / bun tests/complexity-gate.ts --check: exit 0
- bun scripts/metrics-visualize.ts --write: 123 snapshots, 546,594 bytes(1秒未満 — U2-PERF-03 の実測記録: timeout 枠300秒に対し <1%)
- --check round trip: up to date(決定性実測)
- PR #1500 checks: CI Success pass(mergeStateStatus CLEAN)

## 既存・環境起因の記録(no-silent 扱い)

- wall-clock drift(t-codex-hooks-migration 41.3s / t225 32.2s、declared medium): 本 intent の diff と非交差(git diff --name-only で確認)。ホスト負荷で閾値を跨ぐ既存事象であり、再実行 PASS。恒久対応(declared サイズの見直し)は本 intent スコープ外 — 既知でなければ Issue 起票の要否を intent 完了時 sweep で判断
