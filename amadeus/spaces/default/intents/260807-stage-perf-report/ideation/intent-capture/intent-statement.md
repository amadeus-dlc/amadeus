# Intent Statement — 260807-stage-perf-report

上流入力(consumes 全数): なし(本ステージは consumes を宣言しない — GitHub Issue #2405 本文 v2 とユーザー着手指示を入力とする)

## Problem Statement(解決するビジネス問題)

利用モデルの世代交代(例: Codex GPT-5.6 Sol は品質向上と引き換えに作業時間が伸びる体感)のたびに、「Amadeus の性能が出ているか」の判断が体感で行われている。判断材料のうちステージ所要時間・センサー赤率は監査シャード(220 本・131,074 行、クロスレビューで実測)に、§12a レビューイテレーションは record 成果物(約 1,003 ブロック)に既に永続化されているのに、それをステージ性能軸で集計する読み手が存在しない。既存の読み手は `amadeus-runtime.ts summary`(gitignore 対象の runtime-graph.json 由来で遡及不能)、`/amadeus-session-cost`(その薄いラッパ・単一ワークフロー限定)、`amadeus-subagent-stats.ts`(subagent 軸のみ)にとどまる。結果、モデル選定・プロンプト改善の判断が感想ベースに留まり、「モデルが変わると性能が出なくなる」リスクの検出が遅れる。

## Target Customer(誰のための取り組みか)

- 一次: Amadeus 自己開発の運用者(モデル選定・プロンプト改善の意思決定者)
- 二次: Amadeus を運用する全チーム(配布物として同じ CLI を利用)

## Success Metrics(成功指標)

- 全 intent 横断のステージ別基準線(実作業時間の平均・中央値・p95 / レビューイテレーション数 / センサー FAILED 率)が単一コマンドで決定的に出力される(同じ入力 → 常に同じ数字)
- idle 減算(承認待ち・park・session 断)後の「実作業時間」が素の wall-clock と併記され、人間の在席可否とモデル性能が分離される(クロスレビュー実測: 素の窓の 59〜74% が idle 混入)
- モデル帰属は subagent の Model/Model Source(#2279)で正確帰属、不能分は UNKNOWN 区分として fail-closed に可視化(隠さない)
- 破損シャード・欠落属性・パース不能ブロックが無音スキップされず件数報告される

## Initiative Trigger(なぜ今か)

- #2279(subagent Model 属性の記録)が 2026-08-07 に着地し、前向きのモデル帰属が今日から蓄積開始 — 基準線を早く敷くほど比較可能な履歴が長くなる
- クロスレビュー 2 名(CONFIRMED_WITH_REFINEMENTS ×2)が材料の実在・交絡・帰属限界まで実測済みで、要件の不確実性が最小の状態にある
- 計測駆動プロンプト改善(promptfoo 等の前向き eval)の導入前提となる基準線が必要

## Initial Scope Signal

`self-feature`(Amadeus 自体の新機能 — 新規の read-only 集計 CLI+テスト。ユーザー明示選択済み)。要求・完了条件・設計制約の正本は Issue #2405 本文 v2。実装形態(新規 CLI vs 既存 `amadeus-subagent-stats.ts` 拡張)は要件・設計段の裁定事項。
