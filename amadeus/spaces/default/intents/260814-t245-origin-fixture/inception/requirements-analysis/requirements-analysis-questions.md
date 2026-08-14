# Requirements Analysis — 質問と裁定(260814-t245-origin-fixture)

承認: full autonomy ladder による AUTO_DECIDED 1件(Q1 `auto-decision-a46d6575749f1926444467d0f278cc90` 2026-08-14T00:54Z、`amadeus-bolt decide-question` の decided 出力より転記)。

Intent autonomy: **full**(intent-grant-a2c02cc0be70eb9726721fbc5dc88332)。ステージ内質問は人間へ直接提示せず `amadeus-bolt decide-question` の梯子で裁定した(`cid:scope-definition:c1-semi-ladder-routing`)。質問バジェット: Minimal ≤4、実使用 1。

既決事項(再質問しない — `cid:requirements-analysis:c5`): 修正方式 = **方針1**(ローカル bare repo を origin に組む fixture 化。Issue #2971 完了条件1 + ユーザー起動指示の明示推奨)、TDD 必須(origin 不在の赤を先に実測)、プロダクトコード非変更、無音スキップ禁止、検証セット(対象単独 24/24 + full suite --ci + typecheck + lint)。

## Q1. fixture bare origin へ seed する elections corpus の内容

方針1 の採用は既決だが、fixture の corpus 内容は Issue・起動指示のどちらも指定していない。現行テストの価値は実 corpus 全数掃引(HEAD 断面 4150 ファイル / 8,015,636 bytes、`git ls-tree -r --name-only HEAD -- amadeus/spaces/default/elections | wc -l`)にあり、`t245:175-206` の合成シェイプテストが最小合成側を既にカバーしている(developer scan F5)。

A. 実 checkout の elections corpus を fixture へ丸ごと seed する(掃引検出力を保持したまま自己完結化)
B. 最小合成 corpus のみ(shallow-origin テスト `:106-133` の seed 様式そのまま。掃引検出力は失われ :175-206 と役割重複)
X. Other (please specify)

[Answer]: A — `seed-real-checkout-corpus`。裁定: `amadeus-bolt decide-question`、decisionId `auto-decision-a46d6575749f1926444467d0f278cc90`、rung `agent-recommendation`(native solo-election unavailable の loud degradation 記録済み)、2026-08-14。**Mode:** full-autonomy ladder

## 質問化しなかった残余論点(材料性なし — 推奨既定を採用し記録)

- **timeout**: `scaleTestTime(120_000)` は維持(実 corpus 掃引 + 実 git I/O は fixture 化後も残るため契約不変。可逆・低リスク)。コメントの文言は実態に合わせて更新可
- **副作用除去**: 方針1 に内在(fetch による共有 git dir の `refs/remotes/origin/main` 上書きと worktree 台帳変更が消える)。受け入れ基準 FR-4 として明文化
- **skip/N/A 分岐**: 導入しない(Issue 完了条件2 は不採用。ユーザー起動指示「無音スキップは禁止」と方針1 採用により不要)
