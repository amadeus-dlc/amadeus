# Requirements — answer-tag-vocab-fix(Issue #1127)

> 上流入力(consumes 全数): `../reverse-engineering/scan-notes.md`(欠陥所在・消費者2・corpus 実測・影響半径)、codekb の `code-structure.md`・`business-overview.md`・`architecture.md`(re-scans/260717-answer-tag-vocab-fix.md で鮮度確認 — business-overview/architecture は対象面に構造変化なしを RE で確認のうえ前提として消費)。修正方式は E-ATV-RA(2026-07-17T07:09:27Z 開票、表示【3】=(a)+(c) 採用 3/4 — agmsg 一次記録)で確定済み。検証契約は E-OC1 承認(06:39:04Z)。2026-07-17。

## FR-1: ANSWER_TAG_RE のコロン必須化(E-ATV-RA (a))

- **AC-1a**: `packages/framework/core/tools/amadeus-lib.ts:1148` の `ANSWER_TAG_RE` を `/\[Answer\]\s*:/`(コロン必須)へ変更する — 1文字(`?` 除去)の surgical 修正。他の述語ロジック(isFilledAnswer / checkQuestionsEvidence / hasParseableApprovalTimestamp)は無改変
- **AC-1b(regen)**: canonical 修正後に `bun scripts/package.ts`+`bun run promote:self` で 9コピー(dist6+self-install2)を機械同期し、`dist:check`/`promote:self:check` exit 0 を実測(dist 手編集禁止)
- **AC-1c(消費者非改修)**: gate-start ガード(amadeus-state.ts:1731)と advisory sensor(amadeus-sensor-answer-evidence.ts:85)はコード無改変 — 述語は import 共有(RE 実測: 写経なし)につき regen のみで伝播

## FR-2: 回帰テスト(検証契約 — E-OC1 承認済み)

- **AC-2a(trigger fixture・赤側)**: 待機窓一時状態を temp file で再現(transient-state-fixtures — #1132 で persist 済みの cid:code-generation:transient-state-fixtures。committed corpus に置かない)。authoritative 文言(#1127 一次記録): 指示行『[Answer] 記入は leader 承認受領後にのみ行う。 -->』(HTML コメント内)+『leader 承認: (受領後に追記)』+空欄 `[Answer]:` ×複数。修正**前**の述語で `fail:unparseable-timestamp`、修正**後**で `pass:answer-blank` を assert(落ちる実証の両状態 — 注入面は**テストが読む dist import**、regen 反映後に実測。falling-proof-injection-one-set: 実証は非コミットの一時 checkout で赤→復元を1セット)
- **AC-2b(消費者2面ピン)**: 述語直(checkQuestionsEvidence)と sensor seam(evaluateAnswerEvidence)の両方で trigger fixture の pass 化を assert
- **AC-2c(緑側 = corpus 非退行)**: 正当コロン形の代表 fixture(実答埋め+E-code 保持 → `evidence-present` 維持、空欄のみ → `answer-blank` 維持)で collection の非退行を assert(corpus-sweep-for-new-guards の「正当データで赤くならない」側。実 corpus 391 コロン行の全数 sweep は一時スクリプトで実測し結果を PR 本文へ記録 — テスト常設はしない)
- **AC-2d(fs 層)**: fixture は temp dir 実 FS につき tests/integration/ へ(fs-tests-integration-first)。push 前に diff 追加行 lcov 未カバー 0(local-lcov-pre-push)

## FR-3: ノルム様式追補(E-ATV-RA (c) — norm PR 別経路)

- **AC-3a**: cid `requirements-analysis:eoc1-evidence-in-questions-header`(team.md:215)へ「証跡ヘッダの指示文言は『回答の記入は leader 承認受領後にのみ行う』の言い換え定型とし、行頭に `[Answer]` 裸トークンを置かない」を追補する。**e4 留保(転記)**: 追補はこの言い換え定型化に**留め**、規範肥大を避ける(コア修正はコロン必須側)
- **AC-3b(経路)**: 起草 = conductor(e3)、PR 化 = leader(norm-changes-via-pr: 2名レビュー+ユーザー承認)。code PR とファイル非交差(team.md vs core/tools+tests+dist)につき順序独立・並行可

## FR-4: 非目標(スコープ膨張防止)

- **AC-4a**: hasEcode のファイル粒度マスク(amadeus-lib.ts:1188-1192 — RE scan-notes R1)は既存挙動として**変更しない**。本修正は収集語彙のみを是正し、証跡集約の粒度は不変
- **AC-4b**: 修正案 (b)(HTML コメント内除外)は不採用(E-ATV-RA — e4 実測の反例: 260715 requirements-analysis-questions.md:4 の blockquote 指示行(『…[Answer] は選挙裁定の受領後にのみ記入する…』)はコメント外で捕捉不能)

## 横断(bugfix 品質契約)

surgical(1文字+テスト+regen 以外触らない)/ 逸脱は実装前停止 / deslop / PR 1:1(`Fixes #1127`)/ クローズは着地検証後 / 検証列: typecheck / lint / dist:check / promote:self:check / `--ci` 全 exit 0 記録

## トレーサビリティ

FR-1 ← E-ATV-RA (a) ← #1127 修正案 (a)(クロスレビュー e1 scratch 再現+e3 机上トレース)← RE scan-notes(:1148 実測)。FR-2 ← E-OC1 承認済み検証契約 ← RE Architect 合成 (i)〜(iv)。FR-3 ← E-ATV-RA (c)+e4 留保。FR-4 ← RE scan-notes R1(hasEcode マスク)+E-ATV-RA 不採用理由
