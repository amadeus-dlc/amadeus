# Requirements Analysis 質問票 — 260731-open-bug-batch-4

> 判定申告(E-OC1): 本質問票の4問はいずれも仕様裁定・スコープ裁定(ユーザー可視契約/固定済み挙動/修正方式の選択)であり、エスカレーション正準リスト(4)によりユーザー専権 — 選挙対象外。根拠種別: Q1=固定済み仕様(t361 契約)の扱い、Q2=ユーザー可視の表示契約、Q3=修正方式の選択(既存テスト影響のトレードオフ)、Q4=挙動追加(リトライ)の可否。#1797 の計測方式は cid:code-generation:c1-benchmark-baseline-correlation-verify が「実測から導出」を既に規定しているため質問しない(要件に実測導出を固定)。
>
> 上流入力(consumes 全数): business-overview.md、architecture.md、code-structure.md — いずれも observed 6e7a9d701 断面の RE 成果物。各問の機序引用は architecture.md の 260731-open-bug-batch-4 focus 節に依拠する。

## Q1. #1816 — 「record 着地前 close」仕様の扱い

close-while-Running と record main 着地前の close は PR #1689(completion crash recovery)の設計帰結で、`tests/integration/t361-amadeus-mirror-lifecycle-completion.integration.test.ts:262` が契約固定しています。一方 project.md Mandated「verify workflow landing before closing」との乖離がクロスレビューで指摘されています。本 intent の扱いは?

A. **表示層修正のみ(推奨)** — close 順序の仕様は #1689 設計どおり維持(t361 不変)。ノルムと実装の乖離は Mandated の「landing」の実装定義(completionInstance 整合)を注記する別 Issue として記録
B. 仕様変更を別 intent で起こす — 本 intent は表示層のみ、close を record 着地後へ移す仕様変更 intent を後日起票(要件・設計・crash recovery との整合再設計を伴う)
X. Other (please specify)

[Answer]: A. 表示層修正のみ — close 順序仕様は #1689 設計どおり維持(t361 不変)、ノルム乖離は別 Issue で記録

## Q2. #1816 — 終端表示の範囲

クローズ済みミラー本文の終端化はどの行まで行いますか?(導出キーは snapshot.completionInstance の存在)

A. **Status 行のみ Completed 化(推奨)** — `## Status` を Completed へ導出描画。`## Phase`/`## Stage` は最終ステージの事実(CONSTRUCTION/build-and-test)として正確なので現状維持。最小差分
B. 3行すべて終端化 — Status: Completed に加え Phase/Stage も終端語彙へ(表示専用の終端語彙の新設を伴う)
X. Other (please specify)

[Answer]: A. Status 行のみ Completed 化(Phase/Stage は現状維持、最小差分)

## Q3. #1811 — 修正方式

RE 実測: 患部は fixture 偽 stub の不死設計+afterEach の kill 掃引欠落(漏洩テスト3本)。本番 supervisor は fail-closed 実装済みのため本番非改変を推奨(dist 交差回避で4件並行可)。方式は?

A. **方式 C = B+A(推奨)** — afterEach で safety-wait.pid glob → 期限付き SIGTERM→SIGKILL 掃引(rmSync 前、既存テスト無影響)+ stub へ「run-record ディレクトリ実在」ポーリングを付与(将来のテスト追加にも安全。:717/:774/:823 の3テストは record を消さないため無影響 — 実装時に実測確認)
B. 方式 B のみ — afterEach 掃引だけ(最小・決定的だが、新 fixture が別ファイルで作られた場合は守らない)
C. 方式 A のみ — stub ポーリングだけ(掃引なし。テスト異常終了時の即時回収がない)
X. Other (please specify)

[Answer]: A. 方式 C — afterEach 期限付き kill/reap 掃引 + stub へ record 実在ポーリング付与の両方

## Q4. #1800 — spawn-error 限定リトライの可否

診断の対称化(:1411 を expectSuccessfulMigration 同型ヘルパー経由へ)は必須として、加えて spawn-error(EAGAIN/EMFILE/ENOMEM)限定・上限2回のリトライを runMigrationProcess へ入れますか?(signal/exit-status はリトライしない — 製品失敗を隠さない設計)

A. **診断対称化+限定リトライ(推奨)** — 負荷起因の偽赤を構造的に減らし、リトライ発火はログに残す
B. 診断対称化のみ — リトライは入れず、次回発火時の一次確定を可能にすることを本 intent の受理条件とする
X. Other (please specify)

[Answer]: A. 診断対称化 + spawn-error 限定リトライ(EAGAIN/EMFILE/ENOMEM のみ・上限2回・発火ログ)

## 裁定の記録

- Q1=A / Q2=A / Q3=A / Q4=A — AskUserQuestion によるユーザー直接裁定(仕様裁定はエスカレーション正準リスト(4)によりユーザー専権、選挙対象外)。
- ユーザー承認: 2026-07-31T05:47:52Z
