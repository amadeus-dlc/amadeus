# Code Summary — u4-config-overrides-and-diagnostics

上流入力(consumes 全数): business-logic-model, business-rules, domain-entities, performance-design, security-design, unit-of-work, requirements

## 実装概要

U4 = `mirror-projects` 設定の完全形(FR-5)+`repair status` の Project 診断拡張(FR-9、FR-6c/FR-10b 診断面)。Bolt ブランチ `bolt/u4-config-overrides-and-diagnostics`(bolt/u3 47e6b273b に stacked)、コミット列: af3a6838b(本体)→ fd1b8a657(診断文言 — ユーザー裁定 (a) の追補)。builder サブエージェント実装、conductor 検分済み。

## 変更ファイル(正本、測定 ref = bolt/u4 HEAD fd1b8a657)

- `packages/framework/core/tools/amadeus-mirror-config.ts` — `MAX_PROJECT_TARGETS`(U1 の単一要素キャップ)削除、`parseProjects` :436 を N 要素へ一般化(1要素でも不正なら層全体拒否 — 部分リストなし、BR-U4-1)。allowlist・層解決(キー単位全置換 BR-U4-2)・status-names closed set は U1 実装で既成立(差分なし)
- `packages/framework/core/tools/amadeus-mirror-lifecycle.ts` — `MirrorRepairProjectDiagnostic`(:426、summary :446 — 既存 executor 用 `MirrorProjectDiagnostic`(types.ts:463)との衝突回避で Repair 接頭辞)/ `MirrorRepairOutcome.status.projectDiagnostics` :452 / `lifecycleSnapshot` :266 の SnapshotSource 構造型化(:258 — repair 側と同一定義共有、複製導出なし BR-U4-5)/ `diagnosticTargets` :911(config ∪ 台帳 ∪ 所属)/ `unreachableResolution` :947 / `diagnoseProject` :957 / `PROJECT_SCOPE` :972(scope 名 canonical 1定義)/ 文言レンダラ4種 :976-:1021(optionMissingSummary = BR-U4-6 の2手誘導、permissionDeniedSummary = BR-U4-7)/ `runRepairStatus` :1049 で消費

keep 分岐は expectedStatus=null / drift=false 固定。config 0件+台帳0件・Issue 未リンクは API 呼び出し 0・診断列空(既存出力不変 BR-U4-9)。mutation メソッドは本経路から到達不能(BR-U4-4)。台帳 write 0(BR-U4-8)。

## テスト

- `tests/unit/t348-amadeus-mirror-project-config-overrides.test.ts`(10 tests — reviewer 実測 `Ran 10 tests` より是正)— 複数ターゲット / 層全置換(マージなし・auto-mirror 単独層が target を消さない対照)/ 上書き適用と既定表フォールバック(受入条件9の3面)
- `tests/integration/t349-amadeus-mirror-repair-project-diagnostics.integration.test.ts`(24 tests)— drift あり/なし・parked keep・not-member・field-missing・option-missing(availableOptions 内容)・permission-denied・unauthenticated・部分成功・mutation 0 回+record バイト同一・秘匿トークン 0 hit×2・summary 文言6面(受入条件12)
- `tests/unit/t343` 更新 — U1 の「複数要素拒否」を「全要素 parse」へ(一般化面)
- 落ちる実証(fix コミット後実施・復元 ref = コミット SHA): unknown phase 収集空化 → 2 fail / drift 比較固定 → 4 fail / permission 文言差し替え → 1 fail / 誘導節削除 → 2 fail。各復元後 clean 実測

## 検証(実測 exit code)

typecheck=0 / lint=0 / package.ts=0 / promote:self=0 / dist:check=0 / promote:self:check=0 / complexity-gate --check=0(初回 `resolveRepairTarget` CCN 16 → `repairSnapshot` 抽出で解消、baseline 未変更)/ run-tests --ci=1(617 files / 8528 assertions、赤は t132 のみ = #1594 既存赤 — assertion 実文 DOC_TOTAL NaN、本 diff は docs・settings.json 不変更で非関与を確定)

## 逸脱の裁定記録

BR-U4-6/7 の診断文言が C3 verbatim 型に載らない件は builder が**実装前に停止**して報告し、ユーザー裁定 (a)(summary: string 1フィールド追加 — 兄弟型 types.ts:463 の既習様式)を受けて fd1b8a657 で追補。ユーザー承認: 2026-07-28(AskUserQuestion 回答)。設定要素の重複 Project 指定の拒否は要求外のため未実装(下流 reconcileTargets は membership 側 dedup 済み)。それ以外の逸脱なし。

## トレーサビリティ

FR-5, FR-6c, FR-9, FR-10b 診断面 — 受入条件 9, 12。
