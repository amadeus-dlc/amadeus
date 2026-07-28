# Code Generation Plan — u3-lifecycle-integration

上流入力(consumes 全数): business-logic-model, business-rules, domain-entities, performance-design, security-design, unit-of-work, requirements

U3 = U1/U2 の同期機構を lifecycle の全 boundary へ配線(story-map ジャーニー3)。実装は U2 Bolt(bolt/u2-state-reconcile-hardening、358c084b9)に **stacked** した Bolt ブランチ `bolt/u3-lifecycle-integration` の隔離 worktree で行う(先行 Bolt マージ後は rebase --onto で移植 — rebase-onto-squash-stacked)。

## 実装ステップ

- [x] **Step 1: boundary 別同期挙動の配線** — 既存5種 boundary(intent-capture-approved / phase-verified / parked / workflow-completed / manual)へ business-logic-model の挙動表どおり配線。新 boundary・新トリガー機構を作らない(BR-U3-7)。
- [x] **Step 2: phase-verified の期待 Status 導出** — state file の `Lifecycle Phase`(遷移後の現在フェーズ)から導出。boundary の `phase` 引数(前フェーズ)は使わない(BR-U3-1)。`Done` はフェーズ同期で書かない(BR-U3-2)。
- [x] **Step 3: parked の mutation 抑止** — parked boundary / registryStatus=parked の manual sync の両経路で Project Status mutation 0 回(`expectedProjectStatus` = keep — BR-U3-3)。Issue 本文同期は従来どおり。
- [x] **Step 4: completionProjectGate** — component-methods.md:72 の verbatim シグネチャ `{ ready: boolean; blocking: readonly string[] }`。入力は台帳(U2 canonical 読取経路)のみ、Project API 直接照会禁止(BR-U3-8)。ready=true = 全対象 synced かつ lastAppliedStatus=done 名。Done 名の導出は expectedProjectStatus の done 分岐のみ(独自文字列禁止)。
- [x] **Step 5: completion の close ゲート** — workflow-completed で final sync → gate 評価 → ready のみ close。保留は失敗でなく台帳+警告に残し次 boundary の reconcile へ委譲、workflow は停止しない(BR-U3-4/5)。safety-blocked は台帳のみ・receipt は pending 維持(BR-U3-9 — policy.ts:61-65 terminal-block 恒久停止の構造回避)。
- [x] **Step 6: prompt モード ask** — 既存の操作単位 binding へ Project 面要約を内包。新 ask 種別・同意種別を作らない(BR-U3-6)。
- [x] **Step 7: テスト(t346〜t347 予約)** — boundary 表5種×挙動の lifecycle runtime 注入 integration / close 阻止 negative(Done 未達1件 → close mutation 0)と全 Done 後 close 実行の対照ペア / parked 2経路 mutation 0 / ask 文言 golden(Project 面要約の有無対照)。実 FS は integration 層(fs-tests-integration-first)。
- [x] **Step 8: 検証一式** — typecheck / lint / dist 7面 regen+promote:self / dist:check / promote:self:check / run-tests --ci(t132 既存赤 #1594 は許容)/ complexity gate。
- [x] **Step 9: deslop → 全検証再実行 → コミット**(push は conductor)。

## トレーサビリティ

FR-3c/3d, FR-4, FR-8, FR-10a — 受入条件 3,4,5,7,8,10(close 阻止面)、14(新トリガー機構禁止)。逸脱は実装前停止(既存様式準拠と判断する場合も停止対象)。

## テスト戦略

Comprehensive — gate 純関数=unit 可 / boundary 配線・close ゲート=integration(FakeGateway 既習様式、本番コードにテスト分岐を置かない)。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-27T15:06:59Z
- **Iteration:** 1
- **Scope decision:** none

BR-U3-1〜9 実装整合、close ゲート・層分離成立、引数拡張は FD 制約両立の最小形と判定、t346/t347 各15 tests、検証劇場・シムなし。

### Findings

- None
