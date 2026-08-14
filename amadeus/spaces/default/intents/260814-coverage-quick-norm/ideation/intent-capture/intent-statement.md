# Intent Statement — 260814-coverage-quick-norm

上流入力(consumes 全数): なし(本ステージは consumes を宣言しない — 入力はユーザー起動文と intent-capture-questions.md の回答)

## Problem Statement

CI の Patch Coverage Gate は判定そのものが 3 秒である一方、入力である合流 lcov の生成が CI 実測 11 分 03 秒級である。ローカルで同等のフル `coverage:ci` を内側ループに置くと開発が律速し、「push して CI で赤を知る」往復を誘発する(Issue #2933)。PR #2965 で targeted lcov + 本物の `tests/coverage-patch-gate.ts` 再利用による advisory CLI(`coverage-patch-quick`)は着地済みだが、push 前の標準手順としての運用ノルムは Learnings Inbox に未追記である。

本 intent は、蒸留済み本文へ直接書き込まず、`amadeus/spaces/default/memory/project.md` の「Learnings Inbox(未蒸留)」へ1件追記する。

## Target Customer

- **一次受益者**: このリポジトリで自己開発する conductor / エージェント。push 前の patch coverage 往復を 3 分未満の advisory に縮め、フル計測の単独所有を守る。
- **二次受益者**: レビュアーと CI。advisory を blocking gate の代替にしないことが明記され、正本判定は CI の Patch/Project Coverage Gate に残る。
- **対象外**: 配布先プロジェクト。プラグインは `amadeus/config.json` の opt-in でのみ有効で、汎用化はスコープ外。

## Success Metrics

1. Inbox に1件だけ追記され、既存エントリと同じ様式(日本語1箇条、根拠 PR/Issue、実測コマンドと測定 ref、cid コメント)を持つ。
2. 追記本文が次の3点を含む: (a) push 前の標準は `coverage-patch-quick` の advisory、(b) フル `coverage:ci` はゲート直前の最終確認1回に限り、回すときは CI と同等の `-P 4` を付けて重い並行作業をしない、(c) quick は advisory であり blocking gate の代替ではない。
3. 引用する数値・PR/Issue が起草時に再実測・再照合されている(cid:requirements-analysis:numbers-from-command-output-only)。
4. 変更ファイルは `project.md` と本 intent の record のみ。蒸留済み節・無関係ファイル・他 intent record への書込が 0。
5. origin/main 起点の単独ブランチで PR を作り、pr-convergence を回して CI green とレビュー READY を実測した状態で停止する。マージはしない。

## Initiative Trigger

- 2026-08-13 に PR #2965 が merge され、Issue #2933 のツーリング半分が着地した。ノルムの TDD 適用明確化は PR #2962 で着地済み。残るのは「quick を内側ループの標準とする」運用ノルムである。
- ユーザーが self-document / full autonomy / unattended で本追記を明示依頼した。

## Initial Scope Signal

- スコープ: `self-document`(Standard depth、Minimal test strategy)
- 対象ファイル: `amadeus/spaces/default/memory/project.md` の Learnings Inbox 節のみ
- 禁止: 蒸留済み本文への直接追記、無関係ファイルへの変更、他 intent の record への書込、PR マージ
- TDD: 適用外(team.md Testing Posture の文書・書式だけの変更)。関連 docs 検査があれば通す
