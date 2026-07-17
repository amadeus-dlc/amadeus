# Code Generation Plan — answer-tag-vocab-fix(Issue #1127 / Bolt 1)

> 上流入力(consumes 全数): `../../../inception/requirements-analysis/requirements.md`(FR-1〜4)、`../../../inception/reverse-engineering/scan-notes.md`(欠陥所在・注入面)。2026-07-17。

## 実行構成

conductor(e3)直接実装 — 1文字 surgical+テスト2面の規模につき builder 非ディスパッチ(subagent-utilization の規模判断、e2 の #1142 前例と同型)。worktree 隔離: `bolt/1127-answer-tag-colon`(origin/main a4a33e59a 起点)。

## 手順(FR 1:1)

1. same-root inventory(optional-tag 正規表現の同型 grep — 全域)
2. FR-1: ANSWER_TAG_RE コロン必須化(canonical 1文字)→ regen 9コピー(AC-1b)
3. FR-2: 回帰テスト — 述語直(t-eoc1)+sensor seam(t-answer-evidence)の2面(AC-2b)、trigger fixture は #1127 一次記録 verbatim(AC-2a)
4. 落ちる実証: pre-fix dist へ一時 checkout → 赤実測 → 復元(1セット・非コミット)
5. corpus 非退行 sweep(111ファイル、一時スクリプト・scratch 実行)→ PR 本文へ記録(AC-2c)
6. 検証列全実行+lcov 変更行確認(AC-2d)→ deslop 確認 → PR(`Fixes #1127`)+レビュアー先行指名
7. FR-3(ノルム追補)は norm PR 別経路 — 起草文を code-summary に併記し leader へ引き渡し

## 統制

逸脱は実装前停止 / 配線0概念なし(単一修正)/ dist 手編集禁止 / stash はラベル付きのみ(stash-discipline)
