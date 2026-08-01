# Logical Components — U1 perf-tier-and-migration

上流入力(consumes 全数): business-logic-model.md(U1 FD)。nfr-requirements 5成果物は本 scope(self-feature)で同ステージ SKIP のため設計上不存在(engine の consumes_absent expected:true)— fallback として requirements.md の NFR 節と #1830/#1835 実測を一次根拠に具体化する。

測定 ref = observed `da51af375`。

## 論理構成(business-logic-model.md の4ロジックの写像)

| 論理コンポーネント | 実体 | 契約 |
|---|---|---|
| tier セレクタ | run-tests.ts parseArgs + levelFiles | Level 5値、--ci は perf 非包含 |
| perf テスト群 | tests/perf/ 6ファイル | 実時間予算の assert(median 基準不変) |
| 述語ピン | tests/unit の gate 2テスト(移設禁止) | 落ちる実証の常駐 |
| coverage 整合系 | TEST_TIERS+registry/baseline/allowlist | fail-closed 3 gate |

## 境界

- packages/framework/core 無接触(dist/self-install 不変 — drift check で機械確認)
- tests/helpers は tier 非所属の共有層(無移動)
