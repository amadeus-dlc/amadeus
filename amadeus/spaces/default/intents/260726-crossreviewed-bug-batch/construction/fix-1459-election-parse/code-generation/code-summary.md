# Code Summary — fix-1459-election-parse

上流入力(consumes 全数): requirements.md(FR-4)。degrade 構成につき設計系成果物は非生成(plan 参照)。

- Issue: #1459 → **CLOSED**(PR #1517 スカッシュ着地、ユーザー承認マージ)
- 修正: Election.parse を fail-closed 化: choices 空/internalNo 重複/voter 重複を reject(parse-failure 流用、consumer 波及なし実測)。全会一致→誤 tie hold の汚染機序を pre-fix 赤で実証
- 検証: t234 26 pass(修正前4 fail)、election 全19ファイル green、フルスイート 562/0、model-map hash 手更新(ユーザー裁定+#1510 起票)
- 測定 ref: origin/main 着地コミットは PR #1517 参照。着地確認は merge 後の gh state 実測+着地面 grep。
