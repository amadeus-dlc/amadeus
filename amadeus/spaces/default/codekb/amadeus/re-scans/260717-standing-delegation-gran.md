# Re-scan 記録: 260717-standing-delegation-gran

Issue #1125 — 常任委任グラント機構（ステージゲートごとの都度 delegate 発行を、明示的に付与された常任委任グラントで一定範囲・一定期間だけ省ける機構）の設計基盤 reverse-engineering。delegate provenance の既存 seam を消費・拡張する側の調査。

## Base / Observed

- **手法**: diff-refresh（cid:reverse-engineering:c1、E-L63 の base 選定則）。フルスキャン禁止。
- **base**: `e530fc4b13f477e9155d1ec246fd50a49176eadd`
  - 祖先性: `git merge-base --is-ancestor e530fc4b13... HEAD` → exit 0（実測）
  - 距離: `git rev-list --count e530fc4b13...46f51091f` = **67**（実測）
- **observed**: `46f51091f0c8d5d39dc9790a218d03293ffdf060`（`git rev-parse HEAD` 実測一致）
- **measurement-ref**: scan-notes の全件数・行番号・grep 結果は observed HEAD `46f51091f` の作業ツリーで測定。
- **実施体制**: Developer（スキャン）→ Architect（合成）の2サブエージェント直列（cid:reverse-engineering:c3）。
- **Base の真実源**: 本 re-scan 記録の Observed commit。共有 timestamp は repo-level freshness pointer であり次回差分 base の真実源にしない。

## フォーカス面

delegate provenance 機構の挿入 seam（常任委任グラントの状態をどこに持たせるかの設計材料）:

- **(a) `amadeus-lib.ts` 検証・接地層**: `verifyDelegatedProvenance`（:2528-2565、4座標 fail-closed）、`humanActedSinceGate`（:2479-2499、verb-scoped、ledger 欠落時 `return true` fail-open :2483）。呼び出し元 `scanPresenceLedger`（:2413-2419）。forgery 耐性コメント（:2510-2517）と残余限界（:2519-2523、file-write 直書きは CLI ガード外）。
- **(b) `amadeus-state.ts` 接地ゲート・監査書式**: `assertHumanPresentForGateResolution`（:1781-1805、autonomous / `AMADEUS_SKIP_HUMAN_PRESENCE_GUARD` / presence の3分岐 skip）、`handleDelegateApproval`（:1957-2038）。DELEGATED_APPROVAL フィールド全数（:2016-2023）= Stage / Issuer Space / Issuer Intent / Issuer Shard / Issuer Human Ts（+任意 User Input）+ appendAuditEntry の Timestamp。DELEGATED_REJECTION（:2041-2137）は Feedback。
- **(c) `amadeus-audit.ts` mint 拒否**: `PRESENCE_PROTECTED_EVENTS`（:766-770）、`presenceMintRejection`（:780-783）/`rawPresenceMintRejection`（:795-810）。allowlist `VALID_EVENT_TYPES`（:22）。
- **既定除外の分類データ**: phase-check ガード（state.ts:158 の `verification/phase-check-<phase>.md` 要求）、Skeleton Stance（state.ts:568、`## Runtime State` の runtime metadata、`handleSetSkeletonStance` :548-577）。
- **TTL 対照**: `DEFAULT_LOCK_STALE_MS`+`lockStaleMs()`（lib.ts:3629-3638、named constant + env parse + fallback の完全対照）。
- **doctor 可視化**: `DoctorCheck{pass,label,fix?}`（utility.ts:410-414）、`handleDoctor`（:711）、`AMADEUS_DEFAULT_SCOPE` 行（:912-932、直接テンプレート）。
- **env 前例**: `AMADEUS_OPERATING_MODE` は `grep -rn packages/framework/core/` = **0 件**（team モード判定は core 前例なし）。
- **audit taxonomy**: 正本 `audit-format.md` の `## Event Registry (73 events, 18 categories)`（:11）、delegate 行（:79/:80/:51）、`t28-audit-event-sync.test.ts` が3面同期を強制。

## 区間 diff の要点

- `git diff --stat <base>..HEAD` 末尾: **427 files changed, 17676 insertions(+), 352 deletions(-)**（scan-notes §1 実測）。
- 実体は前 intent **260716-answer-preemption-guard**（E-OC1 evidence guard / answer-evidence sensor）の着地。大半は dist/self-install 再生成と各 stage md の `sensors:` 1行追記。
- `packages/framework/core/tools/` 配下の区間変更は3ファイルのみ: `amadeus-lib.ts`（+9、`QUESTIONS_EVIDENCE_CUTOFF_YYMMDD` canonical 化）/`amadeus-sensor-answer-evidence.ts`（+129 新規）/`amadeus-state.ts`（+11/-3、cutoff import 切替）。
- **含意**: 本 intent が触る delegate provenance 3層 seam は区間内で未変更 = 区間より前から安定。挿入面は現 HEAD 実測で確定（scan-notes §2）。区間の新規面（answer-evidence guard）と非交差。

## 更新点

- `code-structure.md`: H1 直後に「delegate provenance 機構の観測 — 常任委任グラントの挿入面（最新: 260717-standing-delegation-gran）」節を新設。旧「最新」= answer-evidence sensor 発火面（260716-answer-preemption-guard）節見出しを「履歴」へ降格（cid:reverse-engineering:c3-relabel、本文不変）。
- `reverse-engineering-timestamp.md`: 冒頭へ「実行メタデータ(最新: 260717-standing-delegation-gran)」ブロックを追加。旧「最新: 260716-answer-preemption-guard」ヘッダを「履歴」へ降格（全文保存）。
- 本ファイル（per-intent re-scan 記録）。

## 温存点（churn 回避、cid:reverse-engineering:c1）

他 body 成果物7点は全て温存:

- `architecture.md` / `business-overview.md` / `api-documentation.md` / `component-inventory.md` / `technology-stack.md` / `dependencies.md` / `code-quality-assessment.md`

理由: 本 intent は既存 delegate provenance seam を消費・拡張する設計基盤調査であり、区間の実体は前 intent の sensor 着地（生成物中心）。フォーカス面（delegate 3層 seam・既定除外分類・TTL/doctor/env 前例）は区間67コミットより前から構造不変で、本 intent は既存機構の理解に留まり構造変化・挙動欠陥を導入しない。code-structure への1節追加で本 intent 観測面は充足。
