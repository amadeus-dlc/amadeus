# Decision Log — 260722-tla-plugin(Ideation)

上流入力(consumes 全数): intent-statement、scope-document、intent-backlog、feasibility-assessment、constraint-register(すべて読了)。competitive-analysis / team-assessment / wireframes は SKIP ステージ成果物のため不在(expected)

## 裁定一覧(すべてユーザー本人の HUMAN_TURN 直接回答 — ソロモード・選挙不要)

| # | ステージ | 論点 | 裁定 | 承認TS |
|---|---|---|---|---|
| 1 | intent-capture Q1 | 成功指標 | E2E動作(5点の実測成立) | 2026-07-22T11:18:31Z |
| 2 | intent-capture Q2 | 実験資材 | 保持(退役は将来intent) | 同上 |
| 3 | intent-capture Q3 | 供給形態 | plugins/ バンドル(compose で opt-in)— 初回提示の事実誤りをユーザー指摘で訂正後に確定 | 同上 |
| 4 | intent-capture Q4 | 完備性sensor対象 | モデル⇔実装対応のドリフト検出 | 同上 |
| 5 | intent-capture Q5 | モデル範囲 | FormalElection 1本のみ(明確化対話2回を経て確定) | 同上 |
| 6 | feasibility Q1 | JDK依存整理 | opt-in 例外として文書化+loud エラー | 2026-07-22T11:31:19Z |
| 7 | feasibility Q2 | JDKピン | temurin 26 メジャー版(適用面: ローカル+イメージ選定) | 同上 |
| 8 | feasibility Q3 | CIランナー | ユーザー裁定: Linux前提・sandbox不要(macOS維持案却下) | 同上 |
| 9 | feasibility Q4 | TLC供給 | Docker イメージ経由 | 同上 |
| 10 | feasibility Q5 | イメージ供給元 | 既成イメージ digest 固定(具体選定は設計段実測) | 同上 |
| 11 | scope-definition Q1 | 実行順序 | risk-first(walking skeleton = P1+P2) | 2026-07-22T11:38:47Z |
| 12 | scope-definition Q2 | MoSCoW | 全5 capability Must | 同上 |
| 13 | scope-definition Q3 | 期限 | なし | 同上 |
| 14 | approval-handoff Q1 | リスク受容 | R1〜R4 を緩和策付きで受容し Inception へ | 2026-07-22T11:42:46Z |

## §13 学習の persist 記録

- intent-capture: c3 採用(専門技法 intent の背景説明先行)— project 層
- feasibility: c5-experiment-constraint-classify 採用(実験制約の分類引き継ぎ)— project 層
- scope-definition: 0件(ユーザー確定)

## 特記事項

- Q3(intent-capture)で conductor が「plugin 機構は現存しない」と誤提示 → ユーザー指摘で実測訂正(cid:absence-claim-grep-verify の違反実例として diary 記録、次回PM回付)
- Q3(feasibility)で conductor の macOS 維持推奨をユーザーが却下 → CI は Linux + Docker へ(§13 で一般化 persist 済み)
