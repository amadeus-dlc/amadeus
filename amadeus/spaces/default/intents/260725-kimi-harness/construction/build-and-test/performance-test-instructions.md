上流入力(consumes 全数): code-generation-plan, code-summary

# Performance Test Instructions — 260725-kimi-harness

Test Strategy: **Comprehensive**(ただし NFR の performance 要件は全 unit で「対象なし/既存水準」の判定 — 各 unit の nfr-requirements/performance-requirements.md)。

## 判定

**負荷・ベンチマークの対象なし**(本 intent は CLI/ライブラリ変更で、レイテンシ・RPS の要件が存在しない — requirements.md NFR-1〜4 と各 unit の performance-requirements.md の判定どおり)。

## 代替の確認(実施済み)

- `bun scripts/package.ts kimi` / `--check` が既存 harness と同程度(秒〜十数秒オーダー)で完了することは B1/B5 の実実行で確認済み(code-summary の検証記録)
- hook adapter のコストは B6 の live journey 実走(3セッションで 79.88s・セッションあたり 23-29s)で実測済みで、hook timeout(既定30秒)を大きく下回る
