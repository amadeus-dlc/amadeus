# 論理コンポーネント — U5 doctor-observability

> 上流入力(consumes 全数): performance-requirements、security-requirements、scalability-requirements、reliability-requirements、business-logic-model、tech-stack-decisions
> 技術前提(Bun 単独・runtime dependency 追加ゼロ・新規外部依存なし)は同 unit の tech-stack-decisions の決定を継承する。

全設計確定後に導出した実装モジュール構成(component-methods C5 と business-logic-model「実装位置」からの転記)。

## 実装モジュール構成

| モジュール | 位置 | 主要関数・内容 | 由来 |
|---|---|---|---|
| doctor plugin 節ビルダー(純関数) | `packages/framework/core/tools/amadeus-utility.ts` 近傍の core 層(export 必須 — in-process テスト seam。既存 doctor ハンドラの実構造に合わせ同居 or 分離を実装時確定) | `buildDoctorPluginSection(diag, record, judgment): DoctorPluginSection` — reliability-design の射影表の実装。ポート不保持(fs / process 参照なし) | performance-design / security-design 層 1 |
| doctor ハンドラ編入 | `packages/framework/core/tools/amadeus-utility.ts` の既存 `--doctor` ハンドラ | diagnosePlugins 呼出+composition record 読取+U6 判定関数呼出(全て既存 read-only 経路)→ 節追加 → exitContribution を既存 doctor 集約 exit へ合流([degraded]/[recovery-pending]/未知状態 = FAIL)。新 verb を作らない(「Adding a Utility Handler」チェックリスト対象外) | security-design 層 2 / reliability-design |
| 型(DoctorLine 拡張) | U2 正本の型定義に対する追加のみ(基底 3 フィールド逐語継承 — BR-U5-5) | recovery-pending / degraded / advisory / activation / **unknown**(写像外状態値の fail-closed 変種 — it.2 是正 2026-07-27) の variant 追加 | reliability-design(型正本) |

- U5 が新設する書込呼出は 0 件(DropsRecord の書き手は U2 骨格・U4 エントリ追加 — doctor は読むだけ)

## テスト層配置(fs-tests-integration-first)

| テスト | 層 | 根拠 |
|---|---|---|
| buildDoctorPluginSection の射影表全行(8 分岐 × 表示行・exit 寄与)、DoctorLine 型正本の文字列一致 | tests/unit | 純関数(入力は fixture オブジェクト、fs 不使用) |
| journalPending fixture の recovery-pending 行+FAIL(既存 t252 journal fixture 面再利用)、DropsRecord fixture の可視性 assert・両 severity 対照、0-plugin baseline diff 1 行、doctor 実行前後 bytes 一致 | tests/integration | 実 FS(record / fixture ツリー)を触るため integration。in-process 駆動で lcov 有効 |
| 既存 t-print-*-doctor 系の期待出力更新 | 現行層のまま | reliability-design(既存テスト同期) |

- 検証コマンド: `bun run typecheck` / `bun run lint` / `bun run dist:check` / `bun run promote:self:check` / `bash tests/run-tests.sh --ci`(scalability-design の少数前提により負荷試験は追加しない)
- 要件対応: 純関数性 assert = performance-requirements の構造検証合否 / bytes 一致・可視性 assert = security-requirements の読み取り専用・silent drop 禁止合否 / 0-plugin diff 1 行 = scalability-requirements の縮退合否 / recovery-pending 行・両側実測・型正本一致 = reliability-requirements の各合否へそれぞれ trace する

## 障害分離(failure domains / blast radius / isolation / shared resources)

- **failure domains**: (1) **節ビルダー純関数面**(`buildDoctorPluginSection` — ポート不保持、fs / process 非接触)、(2) **読取・編入面**(既存 `--doctor` ハンドラ内の diagnosePlugins 呼出+composition record 読取+U6 判定関数呼出 — 全て既存 read-only 経路)、(3) **出力・exit 集約面**(行整形と exitContribution の既存 doctor 集約への合流)。
- **blast radius**: U5 は読み取り専用(新設の書込呼出 0 件)であり、どの領域の失敗も record / dist / composition state を破壊しない(doctor 実行前後 bytes 一致テストが固定)。表示・写像の欠陥は誤診(誤った健全性報告)に閉じるが、未知状態 = FAIL の fail-closed 写像により「異常の無音 pass」方向へは倒れない。exit 寄与の誤りは doctor の合否判定(CI / 利用者)へ波及するため、射影表 8 分岐の全行 unit テストで封鎖。読取元(diagnosePlugins / record)の失敗は doctor 節の表示異常に閉じ、対象状態そのものへ波及しない。
- **component isolation strategy**: 節ビルダーの純関数化(入力を fixture オブジェクトで受ける — 判定と表示の分離)、書込ゼロの構造保証(read-only 経路のみ呼ぶ)、再判定禁止(判定は diagnosePlugins / DropsRecord / U6 が正 — doctor 側は機械写像のみで、判定ロジックの二重実装による分裂障害を作らない)。
- **shared resources**: **composition record**(読取のみ — 書き手は U2 compose 経路)、**DropsRecord**(読取のみ — 書き手は U2 骨格 / U4 エントリ追加。U5 は可視化のみ)、**U6 ActivationJudgment**(U6 の export 判定関数を read-only で呼ぶ — 状態の単方向を保つ)、**DoctorLine 型正本**(U2 正本への variant 追加のみ — 基底 3 フィールドは逐語継承で分裂させない)。

(nfr-design Step 6 の必須内容 — U2 ND レビュー iteration 1 Major 指摘の是正 2026-07-27)
