# Requirements Analysis 質問記録

上流入力(consumes 全数): business-overview、architecture、code-structure

## 対話モード

- 選択: 自律モード full（intent-grant-a1b1f0ad65a1f42daf4fc6e4d9bd3b5b、HUMAN_TURN 2026-08-07T21:53 台（波3 autonomy full 設定確認の実回答ターン）で承認）— 質問は decide-question（auto-decision 記録、後日レビュー可能）で確定
- 質問予算: 最大8問 / 起草4問（クロスレビュー2 verdict（REFINED×2）と RE が残置した真の未決のみ）
- 既決事項は質問化しない: 欠陥の実在・機序（v1 形パーサの v2 未追随）・writer 正常・「間欠フレークではなく決定的常時赤 + CI 死角」の性格づけ・患部17ファイル/除外4ファイルの集合 — いずれも2 verdict と RE 実測で確定済み

## 質問と裁定

### Q1. 修正方式（共有ハーネス寄せ vs in-file 正規化）

RE 実測: 共有ハーネス `tests/harness/audit-records.ts` が v1/v2 両対応の正準リーダーとして実在（normalizeAuditRecord :26 / auditRowsFrom :49 / countAuditEvent :57）、消費実例 59 ファイル。ヘッダコメントが本件を予告（「hand-parses the JSONL should do the same rather than pin one schema」）。in-file 正規化は t-formal-verif（:227-233）1件の前例。

- A. 患部 e2e 17ファイルの自前パーサを共有ハーネスへ寄せる — canonical 1定義原則に合致、59 ファイルの既習様式
- B. 各ファイルへ in-file 両対応正規化を複製 — dist 依存を避けるが、同一意図の17重複を新設
- X. Other

[Answer]: A — auto-decision-dc07901f8449295336a049faea54816a（basis: agent-recommendation、grant intent-grant-a1b1f0ad65a1f42daf4fc6e4d9bd3b5b、reviewState: unreviewed）。根拠: construction ガードレールの canonical 1定義原則。ハーネスの設計意図（ヘッダコメント）が本件の欠陥クラスを名指しで予告しており、寄せることが設計どおりの消費形。B は意図ベースの重複排除違反（17複製）。

### Q2. 共有ハーネスの dist import（EVENT_HEADINGS）が e2e へ持ち込む build 前提

RE 実測: ハーネス :18 が `../../dist/claude/.claude/tools/amadeus-audit.ts` から EVENT_HEADINGS を import。source-only 境界下で dist は未追跡生成物。既存 59 消費ファイル（integration 中心）は同 import で --ci を通っている。

- A. e2e 実行経路（run-tests の e2e tier 起動・CI の t341 実行）が build 済み dist を保証するかを**実装時実測で確定する条件**として AC 化し、保証されるなら import は無改変で採用。保証されない経路が実在した場合のみ停止して裁定
- B. EVENT_HEADINGS を dist 非依存へ分離してから採用 — canonical 定義の複製を作る構造変更（要求外）
- X. Other

[Answer]: A — auto-decision-e5c3fee94518e94c947bad98308cca49（basis: agent-recommendation、reviewState: unreviewed）。根拠: external-seam-vocab-measurement — 存在実測（59 ファイルが通る）と経路実測（e2e tier が build を保証するか）を区別し、後者を実装時実測の確定条件として AC 化する。B は P5 surgical 違反リスク（要求されない分離）。

### Q3. 非 e2e 自前パーサ（件数不一致 14 vs 29、現状 --ci green）の扱い

RE 実測: Developer scan 14件 vs Architect 再列挙 29件 — scan 側述語未記録のため裁定不能（E-ASD-RES13 の起点実測）。いずれも現状 green（v1 writer を読む / 自作 v1 fixture）。t378/t380/t382/t388 は v1 不在 assert が設計意図で患部でない。

- A. 本 intent では修正しない。CG 段で述語記録付きの再棚卸しを行って件数を確定し、「v2 移行時に壊れる latent クラス」として Issue-first 起票（Issue 参照を record へ残す）
- B. 非 e2e も本 intent の修正スコープへ含める — #2328 完了条件（e2e t10 系）の外側への拡大
- X. Other

[Answer]: A — auto-decision-851c864bdc2c66c4023502efff823066（basis: agent-recommendation、reviewState: unreviewed）。根拠: #2328 の完了条件は e2e 面。非 e2e は欠陥未発現の latent 債務であり issue-first-capture の正規経路が Issue 化。再棚卸しは E-ASD-RES13 追補（述語記録）に従う。

### Q4. CI 死角（e2e が PR CI 非実行）の手当てと #2328 表題再定義

RE 実測: --ci は smoke/unit/integration のみ（tests/lib/run-tests-args.ts:95-100）。CI 上の e2e は t341 の1本のみ、nightly 全層ジョブ不在。修正しても同種 drift は再び不可視。両 verdict が表題再定義を推奨。

- A. CI への e2e 追加は実行時間・flake 面の独立トレードオフを持つため**別 Issue として起票**（波2 #2426 と同型の scope-out 回避裁定）。表題再定義は Issue 運営の執行としてクローズ時に実施。残余リスク（修正後も不可視）は requirements の Out of scope へ明記
- B. 本 intent で CI へ e2e 層を追加する — スコープ拡大
- X. Other

[Answer]: A — auto-decision-0baba71d3d18d274290e5a21109bf8a7（basis: agent-recommendation、reviewState: unreviewed）。根拠: CI 変更は独立判断（実行時間コスト・flake 群 #2397/#2382 との相互作用）。表題再定義は leader 裁量（トリアージ）内の執行で両 verdict が推奨済み。

## 裁定の記録

- 4問すべて decide-question（autonomy full、allowedInteractionKinds に question を含む grant）で確定。auto-decision ID は各 [Answer] 行に記載、reviewState: unreviewed（`amadeus-bolt list-auto-decisions` で後日人間レビュー可能）
- ユーザー承認: 2026-08-07T21:53:00Z（波3 autonomy full 設定の実 HUMAN_TURN — 質問裁定経路の包括承認。個別裁定は auto-decision 記録による）
