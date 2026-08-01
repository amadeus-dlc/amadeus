# Stakeholder Map — 260801-tla-multi-model

## Key stakeholders

| ステークホルダー | 利害 | 役割 |
|---|---|---|
| ユーザー(リポジトリオーナー) | drift ガードの実効性・CI 恒常証跡・スコープ裁定 | **決定者**(全ゲートの承認者、Q1-Q3 の裁定者) |
| Amadeus 開発チーム(self-development) | formal-model-check plugin の保守性、第3モデル追加時の安全性 | 実装者兼受益者 |
| intent 260731-formal-verif-value-chain の成果物(u7 model-map v2) | 既存の登録・検証契約との互換性(FormalElection 側不変) | 変更対象の正本 |

## Decision-makers vs. influencers

- 決定者: ユーザー(スコープ・方式・成功定義の裁定、全承認ゲート)
- インフルエンサー: クロスレビュー reviewer 2名の実測知見(`TLA_NAMED_INVARIANTS` 見落とし指摘、INSTANCE 構文の指摘)は要件・設計の入力として採用済み

## Communication requirements

- Issue #1921 / #1920 への進捗反映は mirror Issue(#1937)の状態行と、着地後の close-after-landing-verification で行う
- 変更は plugins/formal-model-check/ + scripts/formal-verif/ + tests/ + .github/workflows/ci.yml に及ぶ見込み — PR レビューで配布面・CI 契約の差分を明示する
