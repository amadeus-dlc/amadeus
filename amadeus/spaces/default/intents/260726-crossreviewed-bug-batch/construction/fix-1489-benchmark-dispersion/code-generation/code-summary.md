# Code Summary — fix-1489-benchmark-dispersion

上流入力(consumes 全数): requirements.md(FR-1)。degrade 構成につき設計系成果物は非生成(plan 参照)。

- Issue: #1489 → **CLOSED**(PR #1507 スカッシュ着地、ユーザー承認マージ)
- 修正: 分散判定を中央値ベース(max/median と median/min の両側比 >2 の AND)へ変更。main の floor 0.05(#1508)と合成。単一スパイク5系列 green / 真の退行 RED の両側実測を fixture 固定
- 検証: typecheck/lint/t292/t229 全 exit 0、CI 全 green。再接地1回(#1508 交差の解消)
- 測定 ref: origin/main 着地コミットは PR #1507 参照。着地確認は merge 後の gh state 実測+着地面 grep。
