# Election Record — E-SRA-CG1

- question: intent 260805-semi-redefine-autonomy-f / code-generation batch(unit autonomy-statusline)の設計逸脱裁定。builder 実測: C14 逐語の配線行(`if (autonomy) output += ` @${autonomy}`;`)を amadeus-statusline.ts の main() へ追加すると CCN 26→27 となり、コミット済み complexity ratchet(shrink-only、tests/.complexity-baseline.json の main=26)と構造的に両立不能(lizard 2 版対照の決定的実測 — 配線 2 行のみの差で +1)。builder は回避策を実装せず停止(HEAD 668c681f5b83f2c52973f70117e06b32b384fe54、他検証は全 green)。候補: A = baseline を 26→27 へ更新(shrink-only の明文に反する方向。--update は全エントリ同時置換)/ B = main() の出力連結部を小ヘルパーへ抽出(ratchet 適合。C14 逐語行・返り値ドメインは保存。FD の「配線 1 行」限定を超える既存コード改変 — 申告付き精密化)/ C = 返り値を表示形にして無分岐化(CCN 不変だが C14 シグネチャ逐語・決定表・t448 と矛盾する明確な FD 逸脱)。参照ノルム: project.md「complexity は blocking gate として維持」(tdd-default 条項)、cid:code-generation:complexity-baseline-ordinal(「第一手は匿名増ゼロの構造回避、baseline 更新は実複雑度変化時のみ」)、意図的免除の shrink-only ratchet 原則(cid:feasibility:c3)。実在根拠は builder report(task 出力)と worktree /Users/j5ik2o/Sources/j5ik2o.github.com/amadeus-dlc/amadeus/.claude/worktrees/agent-a5eb49d09027e8076 の read-only 実測で確認すること。

裁定: B: ヘルパー抽出(申告付き精密化)(choice 1: 2票)
内訳: choice1=2票 choice2=0票 choice3=0票
- 留保(subagent-2, GoA2): B の是正後に lizard 実測で main() の CCN<=26 と C14 逐語行の保存を機械確認し、FD『配線1行』超過の申告を questions/diary へ残すことを条件とする。
- 留保(subagent-1, GoA2): 抽出ヘルパーは匿名 arrow でなく named 関数として既存匿名関数の ordinal を乱さない位置に置くこと(cid:code-generation:complexity-baseline-ordinal の偽 NEW_VIOLATION 回避)、および FD『配線 1 行』超過の申告を questions/diary に必ず残すこと。
票タイムライン: 配信 2026-08-05T13:40:15Z → 配信 2026-08-05T13:40:15Z → subagent-2 2026-08-05T13:41:40Z(受理 2026-08-05T13:42:00Z) → subagent-1 2026-08-05T13:42:10Z(受理 2026-08-05T13:42:32Z) → 開票 2026-08-05T13:50:28Z
GoA[E-SRA-CG1]: 1x0 2x2 3x0 4x0 5x0 6x0 7x0 8x0
