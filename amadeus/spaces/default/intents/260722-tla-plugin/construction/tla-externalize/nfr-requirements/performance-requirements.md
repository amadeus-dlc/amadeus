# Performance Requirements — U1 tla-externalize

上流入力: `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`。

## 実行時間と処理量

- PR・push の通常 CI 経路へ追加の TLC 実行を持ち込まない。U1 の外部ファイル読込と identity 検証は既存テスト帯域内で完了させる。
- `loadTlaModelSource` は FormalElection の `.tla` と `.cfg` を各1回だけ読み、同一処理内で重複 I/O を行わない。
- バイト同値、identity 同値、`model-map.json` 構文検査を含む U1 の unit/integration テストは、通常 CI の既存 timeout を変更せず完走する。

## 資源制約と計測

- モデルはメモリへ全量読込するが、対象は単一モデルでありストリーミングやキャッシュを導入しない。
- 性能退行は既存 CI 所要時間の比較と個別テスト時間で観測する。U1 単独のサービス SLO や throughput SLO は、常駐サービスが存在しないため設定しない。
- TLC 完全探索の30分予算は U3/U4 の責務であり、U1 は外部化によってその予算を悪化させないことだけを保証する。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-23T15:10:39Z
- **Iteration:** 1
- **Scope decision:** none

U1 の fail-closed・単一ソース・既存技術再利用は整合していますが、性能判定基準とエラー観測契約に実装上の曖昧さが残ります。

### Findings

- Major: 性能要件の baseline、許容差、測定環境、反復回数が未固定。
- Major: ModelLoadError の固定 code と HARNESS_ERROR への写像が未定義。
- Minor: 短命処理のログ、テスト証跡、CI 失敗識別方法が未明記。
- Validation: 宣言 sensor は pass-list 内に実行コマンドがなく未実行。
