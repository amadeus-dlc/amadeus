# Election Record — E-MHERA2

- question: intent 260723-marker-heading-exemption(#1296)/ requirements-analysis の明確化質問(verbatim 正本 = e5 worktree <record>/inception/requirements-analysis/requirements-analysis-questions.md — リードオンリー実測可)。Q2. 免除時の出力契約(FR-2)。判断点: 検証劇場 Forbidden(消費されないフィールド禁止)と免除の無音化懸念の両立。A は schema 変更+消費配線(t86 影響)、B は floor 免除と実 H2 pass の弁別が推論依存、C は警告チャネルの意味論汚染。 各自実測確認のうえ、受容度1行併記+GoA 付きで投票。

裁定: A. marker_exempt: true フィールド+schema+消費配線(t86 等)まで含める(choice 1: 3票)
内訳: choice1=3票 choice2=0票 choice3=0票 choice4=0票
- 留保(e4, GoA2): 採用条件は『消費配線まで同一 PR』— 配線が付かない場合は未消費フィールド禁止(検証劇場 Forbidden)により B へ縮退すること。
- 留保(e1, GoA2): marker_exempt フィールドは最低1消費者(t86 等の assert または doctor 表示)まで同一 PR で配線して初めて完成扱い — 消費者ゼロなら検証劇場 Forbidden に転落するため、配線が過大と判明した場合は B へ縮退してよい
- 留保(e6, GoA2): marker_exempt フィールドの消費配線(t86 等での assert)が実装で必ず伴うこと — 消費されないフィールドは検証劇場 Forbidden に転落するため、配線が実装時に不成立なら B へ縮退を再裁定
票タイムライン: 配信 2026-07-23T02:49:33Z → 配信 2026-07-23T02:49:33Z → 配信 2026-07-23T02:49:33Z → e4 2026-07-23T02:50:27Z → e1 2026-07-23T02:53:45Z(受理 2026-07-23T02:54:27Z) → e6 2026-07-23T02:56:52Z(受理 2026-07-23T02:57:03Z) → 開票 2026-07-23T02:57:23Z
GoA[E-MHERA2]: 1x0 2x3 3x0 4x0 5x0 6x0 7x0 8x0
