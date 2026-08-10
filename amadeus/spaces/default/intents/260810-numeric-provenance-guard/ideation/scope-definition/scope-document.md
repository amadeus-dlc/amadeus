# Scope Document — 成果物数値の provenance ガード(第1段)

上流入力(consumes 全数): intent-statement(../intent-capture/intent-statement.md — Problem/Success Metrics/Initial Scope Signal を境界導出の正本とした)。feasibility-assessment / constraint-register は feasibility SKIP(self-feature)のため不在 — 代替制約源 = Issue #2815 完了条件とクロスレビュー収束訂正。

## In Scope(第1段)

1. **数値 provenance advisory センサー** — 新規 sensor manifest(`packages/framework/core/sensors/`)+ 対応検査ツール。ステージ成果物 md 中の数値主張(件数・N/M PASS・%・実測値)の近傍に集計コマンド・測定 ref の併記が存在することを検査する
2. **落ちる実証 fixture** — コマンド併記なしの数値断定を含む fixture で FAILED になることの実証(検査述語の赤側)
3. **corpus sweep + 観測レンジ内確定** — 既存成果物コーパスへの述語 sweep で偽陽性率を実測し、対象クラス(成果物種別 × 数値の意味クラス)・しきい値・適用範囲を観測レンジの内側で確定(c1-threshold-inside-observed-range 準拠。正当コーパスで赤くならない緑側の実証 = corpus-sweep-for-new-guards の両側)
4. **適用限定の写像** — 定型 ack・軽量報告を対象外とするノルム既定の適用限定を検査(matches / 対象選択)に写す
5. **配布同期** — 正本(core)編集 + `bun run build` 再生成、テスト・CI ゲート(coverage/complexity/drift)の充足

## Out of Scope

- **第2段**: 併記コマンドが再実行可能な形式(述語3要素)であることの書式検査 — 別裁定(Issue 明記)
- **全数値の自動再実行照合** — 副作用・環境依存・コストの点で非採用(Issue 代替案)
- **算術誤り・二重計上の検出** — 併記があっても通過する(第1段の構造的限界。derived-value-shows-formula / ledger-count-mechanical-recalc の管轄)
- **#1237(引用実在チェッカー)の実装** — 本 intent では実装しない。述語エンジン共通化の**裁定**のみ設計段で行い、共通化する場合も #1237 側の実装は別 intent

## 実現方式の前提(設計段への入力)

- 実装先例: nfr-budget(数値パターン + 観測レンジ閾値)、answer-evidence(enforcement cutoff 機構)
- 規範正本: project.md「実測値には provenance を添える」(c3-fix-induced-blocker-lssads13 内追補)
- 設計裁定事項: 対象クラス定義 / enforcement cutoff 採否 / #1237 共通化 / 適用限定の写像(intent-capture questions 委譲節)

## Sequencing(Q2 裁定)

measurement-first-dependency-order: 述語プロトタイプ → corpus sweep → 対象クラス・閾値確定 → センサー本実装 + 落ちる実証・適用限定検査。AUTO_DECIDED auto-decision-6c976c8de24f6ed352747b0c5212f5bf。
