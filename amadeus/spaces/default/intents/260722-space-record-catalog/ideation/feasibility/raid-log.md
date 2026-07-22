# RAID Log — 260722-space-record-catalog

上流入力(consumes 全数): intent-statement(intent-capture 産)。competitive-analysis / market-trends / build-vs-buy は market-research SKIP により設計上不在(N/A)。

## Risks

| # | リスク | 影響 | 緩和 |
|---|---|---|---|
| R1 | 「レコード」語が既存文書に残り、新用語「ライフサイクルレコード」と併存する期間の混乱 | 低〜中 | 新規成果物は用語集 T5 で統一。既存文書の改稿は実装 intent の伝播 grep(cid:functional-design:c3)で扱う |
| R2 | 選挙2件の空 timeline により createdAt が導出不能 | 低 | 設計でフォールバック規則(例: 不明マーカー or dir の git 初出コミット日時)を明示する |
| R4 | 103件の選挙ディレクトリ rename に伴う既存参照(E-code 文字列・パス直書き)の破損 | 中 | 参照の多くは E-code 文字列でパス非依存の見込み。設計時に repo 全域の参照棚卸し(パス直書き grep)を必須タスク化 |
| R3 | registry 乖離の解消方針が worktree/ブランチ運用と絡み複雑化 | 中 | 既決の union 解消ノルム(cid:intents-json-union-resolution)を参照モデルとして設計に取り込む |

## Assumptions

| # | 前提 | 検証状態 |
|---|---|---|
| A1 | intent uuid は今後も UUIDv7(時刻順)で発番される | 実測66/66が v7(2026-07-22、ref 0940bdf84)。発番コードの確認は設計時 |
| A2 | 投影は全量再生成で足りる規模が当面続く(現状 65+103 件) | 実測。件数が桁で増えた場合は増分化を再検討 |
| A3 | 選挙 timeline.json は今後も全選挙に生成される | 実測103/103存在 |

## Issues

| # | 事象 | 状態 |
|---|---|---|
| I1 | 本 tree で intent 実ディレクトリ(65)と intents.json(66)が乖離 — dirs のみ3件・registry のみ4件(feasibility-assessment.md 3 項) | 未解消。drift 検出要件の一次証拠として設計入力に採用。解消自体は本 intent 非目標 |

## Dependencies

| # | 依存 | 方向 |
|---|---|---|
| D1 | #1309 ミラー化は park 時の record PR とセット | 本 intent → Issue |
| D2 | 提案語彙の用語集登録は設計成果物のレビュー承認またはユーザー裁定後 | 本 intent → domain-language.md |
| D3 | 実装 intent(将来)は本 intent の整理 ADR・裁定記録を入力とする | 後続 → 本 intent |
