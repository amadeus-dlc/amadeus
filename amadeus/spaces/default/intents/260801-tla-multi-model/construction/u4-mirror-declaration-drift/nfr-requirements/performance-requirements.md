# Performance Requirements — u4-mirror-declaration-drift

**Intent**: 260801-tla-multi-model / **Stage**: nfr-requirements / **Unit**: u4-mirror-declaration-drift(C7+C8-MirrorLifecycle 面)

上流入力(consumes 全数): unit-of-work(u4 節・AC1〜4), business-logic-model(§2 sensor check 拡張 / §3 updateModelMap 拡張 / §5 不変性), business-rules(BR-SC1〜6 / BR-SU1〜6 / BR-IO1〜4), requirements(NFR-1 / NFR-2 / NFR-4), u1 functional-design(リゾルバ線形性), u2 functional-design(BR-V5 deadline・バイト予算)

## パフォーマンス適用判定

本 Unit は内部 CLI / CI 検証ツール(sensor `check` / `updateModelMap`)の拡張であり、応答時間 SLO を持つサービスではない。適用可能な性能要求は「既存の予算・deadline を宣言照合ステップでも侵さない」ことの1点に絞られる(business-logic-model §5「timeout 予算」、business-rules BR-SC6)。

## 要求一覧

| # | 要求 | 測定基準 | 由来 |
|---|---|---|---|
| PERF-U4-1 | 宣言照合ステップのファイル読込は既存の sensor 予算に計上する: `deps.readFile` の totalBytes 予算(sensor :31-33)と check の deadline(sensor :493)を宣言照合の読込でも尊重し、超過時は従来どおり timeout finding で終了する。宣言照合専用の無制限読込経路を作らない | 宣言照合ループ先頭で deadline を確認する実装があること。既存の timeout 系テストが期待値不変で green | business-logic-model §5, BR-SC6, sensor 実測 |
| PERF-U4-2 | 宣言照合の計算量は登録モデル数 N・モジュール依存辺数 E に対し O(N × (V + E)) の線形に留める(u1 リゾルバの推移解決は BFS/DFS 1 回・モジュール名集合比較)。照合のために計測済み identity を再計算しない(集合比較のみ) | コードレビューでリゾルバ呼出がモデルごと高々1回・再計算なしを確認。check 全体の実行時間が既存 sensor 系テストで実害ある退行を示さないこと(登録モデル2件規模で現行と同オーダー) | BR-SC6, u1 リゾルバ仕様, business-logic-model §2.2 |
| PERF-U4-3 | 同一資産の二重読込を禁止する: 宣言照合は §2.1 で safeReadFile 済みの bytes を readModule アダプタ経由で再利用し、未読込モジュールのみその場読みする | readModule アダプタが計測済み資産を優先返却する実装であること(BR-SC6 の pass 条件と同一) | business-logic-model §2.2, BR-SC6, u2 BR-V5 |

## 非適用の補足

スループット・同時実行数・レスポンスタイム目標の設定は非適用である。根拠: 本 Unit の変更面は単発実行の CLI ツール(sensor check / updateModelMap)で、利用者は開発者と CI ジョブのみ、処理対象は登録モデル2件(FormalElection / MirrorLifecycle)の小規模 fixture 的データであり、負荷特性を定義する意味を持たない(requirements NFR-1/2/4 にも性能目標の定義なし)。u5 の CI 探索時間予算(30 分 timeout)は u5 の Unit 面で扱う事項であり、u4 の sensor 変更は TLC 探索経路に関与しない(business-logic-model §0 の Unit 境界どおり)。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-01T21:52:59Z
- **Iteration:** 1
- **Scope decision:** none

NFR artifacts complete, measurable, BR/NFR-traceable; N/A judgments evidence-based; fail-closed and patch-coverage carried. Findings: none.

### Findings

- None
