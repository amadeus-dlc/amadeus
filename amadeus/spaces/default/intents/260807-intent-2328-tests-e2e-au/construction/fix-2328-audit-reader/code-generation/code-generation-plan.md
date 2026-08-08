# Code Generation Plan — fix-2328-audit-reader

上流入力(consumes 全数): requirements（`inception/requirements-analysis/requirements.md` FR-1〜FR-5 / AC 系が本 unit の正本。unit-of-work.md 不在は scope 設計どおり consumes_absent expected:true）

- Unit: fix-2328-audit-reader（degrade 単一 unit — Issue #2328）
- トレーサビリティ: 全ステップは #2328 と requirements FR-1〜FR-5 へ遡る（user stories SKIP のため intent 直結）

## 実装ステップ

- [x] Step 1: **FR-3 の実装時実測を最初に行う** — e2e tier の実行経路（`tests/lib/run-tests-args.ts` の e2e 起動と `tests/run-tests.ts` の実行前提、ci.yml:252 の t341 実行 job）が build 済み dist を保証するかを実測（実測コマンドと結果を記録）。保証されない経路が実在したら**実装を停止して報告**
- [x] Step 2: Red の確認 — 患部17ファイル（re-scans §3 の e2e 列挙が正）のうち代表3件（t10 / t05 / t07）を単独実行し、RE 実測（t10 = 2 pass/2 fail 等）と同一の失敗集合を再確認（既存テストの現失敗が TDD Red — 新規 Red 作成は不要）
- [x] Step 3: 患部ファイル（当初17 — E-ASD-CGDEV 裁定で t02/t06 を追加し**19**へ改訂）の自前 v1 パーサを `tests/harness/audit-records.ts` の正規化 API（normalizeAuditRecord / auditRowsFrom / countAuditEvent — 用途に応じ選択）の消費へ置換（FR-1）。**writer（packages/framework/core/）は無改変**（AC-1b）。ハーネス自体も原則無改変（NFR-2）
- [x] Step 4: Green 実測 — 患部17ファイルを各単独実行し全 green（AC-1a — 各ファイルの pass/fail と exit code を全列挙）
- [x] Step 5: FR-2 vacuity guard 落ちる実証 — t09:211（WORKTREE_DISCARDED=0）/ t07:371（AUDIT_MERGED=0）/ t07:530（AUDIT_FORKED=0）の3 assert について、対象行が実在する状態で赤くなることを注入→赤→復元→残渣ゼロの1セットで実証（AC-2a。注入はテストが実際に読む面へ）
- [x] Step 6: FR-4 再棚卸し — 検索述語（パターン・対象集合・除外条件）を明記した非 e2e 自前パーサの全数棚卸し（14 vs 29 不一致の解消）。結果と述語を code-summary へ記録（修正はしない — Issue 起票は conductor が実施）
- [x] Step 7: `bun run typecheck` / `bun run lint` exit 0（NFR-1）。`git status` で tracked 差分 = tests/e2e/ の患部17のみを確認（AC-1b/AC-4c の機械検査）
- [x] Step 8: e2e 全層の回帰確認 — 患部17を含む `bun test tests/e2e/`（または run-tests の e2e tier）を1回実行し、修正起因の新規赤がないことを確認（既存の無関係な赤があれば帰属を base 対比で切り分けて報告 — bt-20260730-2）

## 制約・逸脱規律

- 触ってよいファイル: `tests/e2e/` の患部ファイルのみ（当初 re-scans §3 の17 → E-ASD-CGDEV 裁定で t02/t06 込みの19が正）。writer 面（packages/framework/core/）・共有ハーネス（tests/harness/audit-records.ts）・除外4ファイル（tests/integration/ の t378/t380/t382/t388）は**禁止**
- 逸脱（既存様式準拠と判断する場合含む）は実装前停止・最終メッセージで報告
- 検証は同期完遂。git commit・state 変更コマンド（amadeus-orchestrate / amadeus-state / amadeus-log / amadeus-bolt / amadeus-election）禁止
- 新規テストファイルは原則不要（既存の修正のみ）。必要になったら停止して報告（採番は t484 以降）

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-07T23:56:15Z
- **Iteration:** 1
- **Scope decision:** none

患部19ファイル全ての共有ハーネス置換を残存 v1 パーサ grep 0件+個別実読で確認。writer・ハーネス・除外4の無改変を diff で機械確認。E-ASD-CGDEV 裁定2逸脱の申告反映（患部分類・19拡大）を照合、無申告逸脱なし。vacuity 3 assert 現存・注入残渣0、FR-3 引用逐語一致。FOLLOW-UP 3件は conductor 是正（行シフト cite 更新・plan の19改訂）+ B&T 引き継ぎ（既存赤の base 帰属正式確認）。

### Findings

- FOLLOW-UP | requirements.md FR-2 | vacuity assert の行番号が import 追加でシフト（:211→:206 / :371→:361 / :530→:520）— 是正適用済み
- FOLLOW-UP | code-generation-plan.md | 裁定前の17ファイル表記が残存 — 19へ改訂適用済み
- FOLLOW-UP | code-summary 残余赤帰属 | t267/setup×2/t17/t66 は import 交差なし止まり — 未改変 base 再現の正式確認を build-and-test 段へ引き継ぎ
