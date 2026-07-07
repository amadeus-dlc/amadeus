# Team Assessment — インストーラの実装

> ステージ: team-formation (Ideation) / 作成: 2026-07-07
> 上流入力: `../scope-definition/scope-document.md`、`../scope-definition/intent-backlog.md`、`../feasibility/feasibility-assessment.md`
> 決定の出典: `team-formation-questions.md`(3問、全問回答済み)

## 体制

**ソロメンテナ + AI エージェント(AI-DLC ドッグフーディング)**(Q1)。

- 人間: メンテナ1名 — レビュー・承認・マージ・npm 公開(Q2)のすべてを担う
- AI: Amadeus の Construction Bolt(developer-agent ほか)が実装を担当。Bolt 運用はデフォルト(walking skeleton ゲート + ladder プロンプト、Q3)

## キャパシティ評価

- タイムライン制約なし(feasibility Q5: 品質優先)のため、ソロレビューのスループットがボトルネックになっても問題ない
- intent-backlog の Must は5プロト Unit — 依存優先の直列順のため、並列レビュー負荷は発生しにくい構成

## 意思決定者

全フェーズの意思決定者はメンテナ本人(単一)。外部パートナー・AWS Professional Services 等は不要(feasibility: クラウドインフラ非依存)。

## リスク

- **単一障害点**: レビュー・公開権限がメンテナ1名に集中。OSS として許容(現行運用と同一)し、緩和策は設けない
- **npm 公開権限**: メンテナ自身が組織スコープ `amadeus-dlc` を取得する(feasibility R1 の解決オーナーが確定)
