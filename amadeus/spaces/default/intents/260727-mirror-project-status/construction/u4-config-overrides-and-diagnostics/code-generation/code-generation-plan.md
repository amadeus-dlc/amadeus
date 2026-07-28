# Code Generation Plan — u4-config-overrides-and-diagnostics

上流入力(consumes 全数): business-logic-model, business-rules, domain-entities, performance-design, security-design, unit-of-work, requirements

U4 = `mirror-projects` 設定の完全形(FR-5)+ `repair status` の Project 診断拡張(FR-9、FR-6c/FR-10b 診断面)。実装は U3 Bolt(bolt/u3-lifecycle-integration、47e6b273b)に **stacked** した Bolt ブランチ `bolt/u4-config-overrides-and-diagnostics` の隔離 worktree で行う。

## 実装ステップ

- [x] **Step 1: config allowlist 拡張** — amadeus-mirror-config.ts の unknown-key 拒否(:335-339 既習様式)へ `mirror-projects` を許容キー追加。closed schema: 配列 / 要素 = `project`("<owner>/<number>")+任意 `status-names`(キーは MirrorPhaseKey closed set)。unknown phase キー・形式不正・非配列は issue 化し当該層の値を無効化(BR-U4-1)。
- [x] **Step 2: 層解決** — 3層(global/space/intent)で「新キーの有効値を持つ最後の層が勝つ」全置換・層間マージなし。`auto-mirror` とキー単位で独立解決(BR-U4-2)。`MirrorConfig` を `{ autoMirror, projects }`(projects 既定 [])へ拡張(component-methods C1 verbatim)。
- [x] **Step 3: status-names 上書きの意味** — フェーズ→選択肢名の写像のみ変更、未指定フェーズは C2 の既定表へフォールバック(canonical 1定義、上書き側で表を複製しない — BR-U4-3)。
- [x] **Step 4: repair status の projectDiagnostics** — runRepairStatus(amadeus-mirror-lifecycle.ts:816)へ read-only 診断列を追加(component-methods C3 verbatim: project/membership/currentStatus/expectedStatus/drift/resolution 4値/availableOptions)。台帳(U2 projectSync)から部分成功検出(BR-U4-8、台帳 write 0)、期待 Status は `expectedProjectStatus` 共有消費(BR-U4-5、複製導出禁止)、keep 時は expectedStatus=null かつ drift=false 固定。所属外れ entry は membership: "not-member"。
- [x] **Step 5: 診断文言** — option-missing に availableOptions と解決手順誘導、permission-denied は対象 Project+必要権限(`project` scope)のみ・秘匿情報なし(BR-U4-6/7)。設定0件+所属0件は診断列空・既存出力不変(BR-U4-9)。
- [x] **Step 6: mutation 0 保証** — repair status 実行中の gateway mutation(addProjectItem/updateProjectItemStatus)呼び出し 0 回を FakeGateway history の negative assert で固定(BR-U4-4、受入条件12)。
- [x] **Step 7: テスト(t348〜t349 予約)** — 受入条件9の3面(unknown key 拒否/層置換/上書き適用)を config unit で固定、落ちる実証 = unknown phase キーの実行時消費行注入。受入条件12の診断ケース(drift あり/なし・field-missing・option-missing+availableOptions・permission-denied・部分成功)+秘匿注入 0 hit。実 FS(config 3層)は integration、純関数は unit(fs-tests-integration-first)。
- [x] **Step 8: 検証一式** — typecheck / lint / dist 7面 regen+promote:self / dist:check / promote:self:check / run-tests --ci(t132 の赤は #1594 — main 側修正着地済みの可能性があるため assertion 実文で再帰属)/ complexity gate。
- [x] **Step 9: deslop → 全検証再実行 → コミット**(push は conductor)。

## トレーサビリティ

FR-5, FR-6c, FR-9, FR-10b 診断面 — 受入条件 9, 12。逸脱は実装前停止(既存様式準拠と判断する場合も停止対象)。

## テスト戦略

Comprehensive — config parse・診断分類=unit 直叩き / 実 FS 3層・repair status 経路=integration(FakeGateway 既習様式、本番コードにテスト分岐を置かない)。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-27T15:49:32Z
- **Iteration:** 1
- **Scope decision:** none

BR-U4-1〜9 実装一致、裁定(a)範囲内、mutation 0・台帳 read-only 実測、Minor(t348 件数誤記)は是正済み。

### Findings

- Minor: code-summary の t348 件数 12→実測 10(是正済み)
