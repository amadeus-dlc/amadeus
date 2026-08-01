# Business Logic Model — u8-e2e-acceptance

上流入力(consumes 全数): unit-of-work, unit-of-work-story-map, requirements, components, component-methods, services

u8 は検証専用 Unit(unit-of-work.md の u8、UG Q1=A ユーザー裁定)— FR-E1〜E3 の e2e audit 実測で価値到達を証明し、発見不具合の glue 修正と実測記録の record 固定を行う。unit-of-work-story-map.md の「価値到達が audit で証明される(機構完成・価値不達の再発防止)」に対応。advisory 機構の契約(発火点集合・Advisory 型)は component-methods.md の C4/C5 節、モデル到達面は同 C8 節に依拠する。機構テスト green のみでの完了は不可(#1738 (d)、cid:intent-capture:ux-first-scope-for-distribution-intents)。

## 実測シナリオのモデル

### S1: advisory 到達の e2e(FR-E1)

手順: (1) 実 spec 変更(specs/tla/ の .tla へ意味のある変更を注入 — never-run 状態の作成でも可) (2) `next` を発火点ステージで実行 (3) directive JSON の advisories フィールドに Advisory が載ることを実測 (4) conductor(実セッション)が提示・formal-model-check ステージを起動 (5) 検証結果(TLC verdict)到達。証跡: audit の formal-model-check ステージイベント ≥1 件(services.md の CLI 面が全 unit 揃った状態で初めて貫通 — components.md の C4/C5+C8 依存)。

### S2: チェックポイント両貫通(FR-E2)

- CP1 経由: 要件矛盾シナリオ — spec 変更後の requirements-analysis 前 advisory 発火 → formal-model-check 実行 → 矛盾検出 → 要件是正、の1周を実 intent(dogfood)または録画相当の実測記録で貫通。
- CP2 経由: 設計矛盾シナリオ — functional-design 前 advisory 発火からの同型1周。
- 実測形: 本 intent 自身または軽量 dogfood intent の audit shard に実イベント列が残ること(演出・手書きイベントは検証劇場 Forbidden — 全イベントは実行由来)。

### S3: 新規モデル到達(FR-E3)

MirrorLifecycle(u7)が TLC 完全探索の verdict に到達すること+AsImplemented 変種の落ちる実証(反例トレース)を record へ保存すること(u7 の CI 統合契約どおり: AsIntended=恒常 green / AsImplemented=一度限り実証)。

### S4: glue 修正

S1〜S3 の貫通中に発見した不具合の修正は「既存 FR の範囲内の是正」に限る(スコープ内 glue)。新機能・仕様変更に当たる発見は Issue 起票してユーザー裁定へ(implementation-deviation-election — u8 で勝手に広げない)。

### S5: 実測記録の record 固定

`<record>/construction/u8-e2e-acceptance/` 配下に: 実測手順・audit イベント列の抜粋(seq 番号+verbatim)・S3 の反例トレース・S4 の処置一覧。数値・件数はコマンド出力からの転記のみ(numbers-from-command-output-only)。

## 不変条件

- **I1(実測のみ)**: すべての証跡は実行由来(audit shard の実イベント・実コマンド出力)。手書きイベント・演出は検証劇場 Forbidden。
- **I2(前提)**: u4(全ツリー compose)・u5(advisories)・u7(モデル)の着地(edge block depends_on)。
- **I3(完了定義)**: S1〜S3 の全貫通が本 intent の workflow 完了の前提(bt-workflow-completion-substance-gate — state 前進を実体完了と同一視しない)。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-31T13:44:14Z
- **Iteration:** 1
- **Scope decision:** none

iteration 1 READY。FR-E1〜E3 と S1〜S3 の 1:1・Won't 境界・依存・完了定義すべて実測確認。Minor(component-methods/story-map の本文スラッグ未参照)は実参照追記で即時是正。reviewer の sibling FD 直読(u7 整合確認)は自己申告 — 結果は整合確認のみで verdict 不変。UTC 2026-07-31T13:43:14Z

### Findings

- Minor: 2 スラッグの装飾的ヘッダ参照 — 本文へ実参照追記で是正済み
- reviewer scope 逸脱(u7 FD 直読 — cross-unit 整合確認)自己申告 — diary 記録
