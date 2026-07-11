# Unit Test Instructions — p3-repair-batch6

## 実行

- 単層: `bash tests/run-tests.sh --unit`(unit 層は runner が直列固定)
- 本 intent の新規テスト(いずれも in-process seam 駆動、spawn 使用時は `env: process.env` 明示):
  - `tests/unit/t211-swarm-batch-progress.test.ts`(#841 — 再入/前進両経路のバッチ進行)
  - `tests/unit/t211-workspace-scan-generalize.test.ts`(#840 — packages/-only brownfield、SCAN_EXCLUDE 保全、phantom entry)
  - #842/#836 の seam テスト(jump 境界イベント・Phase Progress flip 4経路)
  - #848 の seam テスト(declare-docs-only evidence 検査・免除分岐・GUARD_EXEMPTED emit)

## 落ちる実証の再実行(必要時)

各 unit の code-summary に revert 手順と RED 出力を記録済み — 修正 revert → 対応テスト RED → 復元 GREEN で検証可能。
