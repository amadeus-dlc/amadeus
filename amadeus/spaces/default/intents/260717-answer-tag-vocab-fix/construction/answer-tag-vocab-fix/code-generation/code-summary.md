# Code Summary — answer-tag-vocab-fix(Issue #1127 / Bolt 1)

> 上流入力(consumes 全数): `../../../inception/requirements-analysis/requirements.md`(FR-1〜4 の AC 全数)、`../../../inception/reverse-engineering/scan-notes.md`(欠陥所在)。2026-07-17。

## 出荷物(PR #1153、head 66f8c885b)

- `packages/framework/core/tools/amadeus-lib.ts:1151`: `ANSWER_TAG_RE` コロン必須化(1文字 — AC-1a)+ regen 9コピー(AC-1b、dist:check/promote:self:check 0)。消費者2面は無改変(AC-1c)
- 回帰テスト: t-eoc1-gate-evidence(+2 — trigger 形→`pass:answer-blank`、blockquote 反例→`no-answer-tag`)、t-answer-evidence-sensor(+1 — sensor seam 側 trigger)— 消費者2面ピン(AC-2b)、authoritative 文言は #1127 一次記録 verbatim(AC-2a)

## 検証実測(全 exit 0)

- 落ちる実証: pre-fix dist 一時 checkout → 新規テスト **2 fail** → 復元 → 39 tests 0 fail(AC-2a 両状態・1セット非コミット)
- corpus 非退行 sweep: **111 questions ファイル全件 verdict 不変**(pre/post 全数 diff 空 — 内訳 41/7/4/50/9。AC-2c、一時スクリプト scratch 実行)
- lcov: 変更行 :1151 = 39 hits(dist import 面 — AC-2d)/ same-root inventory: 同型1件のみ
- 検証列: typecheck / lint / dist:check / promote:self:check 全 0、`--ci` 372 files / 0 fail PASS

## FR-3(ノルム追補)起草文 — leader へ引き渡し(norm PR 別経路)

cid `requirements-analysis:eoc1-evidence-in-questions-header` への追補案: 「証跡ヘッダの指示文言は『回答の記入は leader 承認受領後にのみ行う』の言い換え定型とし、行頭に `[Answer]` 裸トークンを置かない(#1127 の語彙衝突封鎖 — E-ATV-RA (c)。追補はこの定型化に留める — e4 留保)」

## 逸脱・ヒヤリ申告

逸脱なし。ヒヤリ1件(自己捕捉): 落ちる実証の pre-fix checkout 時に**ラベルなし bare stash** が修正を巻き取り(stash-discipline 違反)、直後の grep 照合で検知 → stash@{0} 明示 apply+drop で復元・緑側再実測 — E-PM9 台帳類型として diary 記録
