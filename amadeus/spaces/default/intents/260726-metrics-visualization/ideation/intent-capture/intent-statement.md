# Intent Statement — metrics 可視化(B1 後続)

## Problem Statement(解決する問題)

`metrics/` には 2026-07-12 以降 123 件のスナップショット JSON(schema_version 1、6 コレクタ: ccn / coverage / loc / tests / test_pyramid / dist_size、commit SHA 付き)が蓄積されているが、可視化手段が存在せず、コードベース健全性の**トレンド**(coverage の低下、CCN の増加、dist の肥大等)を人間が把握できない。現状はゲート(complexity ratchet・codecov 等)による回帰防止のみで、傾向の観測は JSON を目で読むしかない。

## Target Customer(誰が得をするか)

ユーザー(j5ik2o)本人。リポジトリのコードベース健全性を時系列で定点観測し、劣化の兆候を早期に発見したい。閲覧はローカル(`metrics/index.html` をブラウザで開く)で完結する。

## Success Metrics(成功基準 — ユーザー裁定 Q4=D)

1. **主**: 1 画面で全 6 系列のトレンドが把握でき、劣化(coverage 低下・CCN 増・dist 肥大)が一目で分かる
2. **従**: 閾値超過(例: CCN over_threshold の増加)が視覚的に強調される(既存ゲートの補完)
3. **従**: 各データ点からスナップショット時点の commit SHA へ遡れる(トレーサビリティ)

## Initiative Trigger(なぜ今か)

- 出典系譜: Issue #921 論点欄「可視化の要否」→ intent `260712-metrics-observation` の scope Out 1 / `ideation/scope-definition/intent-backlog.md` **B1**「可視化(トレンドグラフ生成)」
- B1 の発動条件「snapshot が蓄積してから価値が出る」を充足(123 件・約 2 週間分)
- ユーザーの明示要望(2026-07-26)「metrics/ を作ってもらったけど可視化ができていない」

## Initial Scope Signal(スコープ初期信号)

- スコープ: `amadeus-feature`(Amadeus 自己開発の新機能 — project.md Scope Overrides 既決)
- 方向性: B1 備考どおり「静的 HTML 生成等の軽量案」— Bun 単独・外部 runtime 依存ゼロ(project ノルム)、self-contained HTML
- ユーザー裁定(2026-07-26T04:54:00Z、詳細は intent-capture-questions.md):
  - Q1=A: `metrics/index.html` をリポジトリにコミット
  - Q2=C: 既存 metrics-snapshot CI job に同乗+手動コマンドの両方
  - Q3=A: 全 6 系列を可視化対象とする
- 非スコープの既決継承: カバレッジの時系列可視化サービスとしての Codecov は既保有 — 本件はリポジトリ内台帳の横断表示であり重複構築にあたらない(260712 build-vs-buy 既決の枠内)

## 承認系譜(approval-lineage)

1. Issue #921(2026-07-12 起票、クロスレビュー 2/2)— 「論点: 可視化の要否」として明示未決
2. intent `260712-metrics-observation`(complete)— 可視化をスコープ Out と裁定し intent-backlog.md B1 として台帳化(「着手はそれぞれ独立の判断による」)
3. 本 intent(2026-07-26)— ユーザーが B1 着手を明示指示(issue-selection-user-decides 充足)し、新 intent としての birth を承認
