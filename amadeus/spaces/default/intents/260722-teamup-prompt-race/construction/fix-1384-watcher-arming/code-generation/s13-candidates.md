# §13 学習候補 — code-generation(260722-teamup-prompt-race)

提出: conductor e1、2026-07-22T23:42Z 頃。leader の採否選挙用 verbatim 正本。

## 候補1(採用提案)

**候補文**: degrade スコープ(units-generation SKIP)の §12a reviewer-runtime `scope` は、directive の `{unit-name}` テンプレートが未解決のまま produces 実在検査に入り「required review artifact is missing: …/{unit-name}/…」で拒否される — conductor は実 unit ディレクトリ名(cid:degrade-scope-unit-dir-layout で配置した fix slug)で produces/consumes を解決した directive JSON を `scope` へ渡してから §12a を開始する。

**統合先想定**: cid:code-generation:degrade-scope-unit-dir-layout への追補(reviewer-runtime 面)。cid:code-generation:checkread-degrade-scope-unavailable と同族の degrade スコープ §12a 制約ファミリ。

**実測根拠**: 本ステージで `bun .claude/tools/amadeus-reviewer-runtime.ts scope < directive.json` が
`amadeus-reviewer-runtime: required review artifact is missing: amadeus/spaces/default/intents/260722-teamup-prompt-race/construction/{unit-name}/code-generation/code-generation-plan.md`
で exit 1 → `{unit-name}` を `fix-1384-watcher-arming` へ解決した directive で正常 scope 発行(invocationId `f6328be4-1ea1-4b9c-92c0-acdb7f5bc8e1`、paths 4件)→ 以降の §12a(2 iterations、complete-review exit 0×2)が全て成立。

## 不採用(PM 違反実例カウントへ回付、ノルム新設不要)

- **(a)** builder の code-summary 検証コマンド表にテストパス2件のディレクトリ prefix 欠落 — cid:build-and-test:test-path-set-completeness の既存違反類型。conductor が正パス4ファイルで再実行し `Ran 94 tests across 4 files`+件数一致(94 pass)で閉包。summary は是正済み
- **(b)** §12a reviewer(architecture-reviewer)が iteration 2 でスコープ4ファイル外(scripts/team-up.sh、tests/)を直接実測 — §12a スコープ契約の違反実例。conductor が同一項目を独立実測済みで verdict は自立成立、diary Deviations に記録済み。既存契約の執行問題でありノルム新設不要

## 参考(本ステージ起票済み Issue — 学習候補ではない)

- #1388(codex 同型ギャップ、FR-6 棚卸し起票)
- #1389(テストの fixture clone-id audit 汚染、P2/S3)
