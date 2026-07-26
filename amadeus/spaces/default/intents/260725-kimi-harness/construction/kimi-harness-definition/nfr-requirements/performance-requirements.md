上流入力(consumes 全数): business-logic-model, business-rules, requirements, technology-stack

# Performance Requirements — kimi-harness-definition

> 上流入力の使用箇所: business-logic-model.md の生成フローと business-rules.md の BR-3(ロジック非保持)、requirements.md の NFR 方針、technology-stack.md の実行基盤(bun)を評価の前提とする。

## 対象と判定

本 Unit はビルド時のパッケージング定義であり、実行時の性能対象(レスポンス・スループット)を持たない(requirements.md NFR-1〜4 に性能項目なし)。

## 測定可能な基準

- `bun scripts/package.ts kimi` の完了: 既存 harness(claude 等)と同程度の生成時間で完了すること(目安: 秒〜十数秒オーダー。生成物の規模は technology-stack.md の既存 dist と同型で、runner-gen が支配的)。厳密な数値目標は設けず、CI の t145(byte-parity)が実効の回帰検査となる
- `--check` の temp 再生成も同様に既存水準

## 根拠としての N/A

実行時サービスを持たないため、レイテンシ・RPS 等の指標は **N/A**(存在しない対象 — services.md の判定と同じ理由)。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-25T12:52:06Z
- **Iteration:** 1
- **Scope decision:** none

performance/scalability の N/A は正直で反証可能。reliability(byte-parity・t145・再生成)は FR-1b/BR-7 と一致。検出3件は全て minor で同一 iteration で修正済み。

### Findings

- (minor / security) BR-4 引用の緩さ → 修正済み(設計意図の記述に変更)
- (minor / security) コンプライアンス参照の不精確 → 修正済み(§制約の内訳で明記)
- (minor / performance) 定性目標 → 修正済み(秒〜十数秒オーダーの目安を追記)
