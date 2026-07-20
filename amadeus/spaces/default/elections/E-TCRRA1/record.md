# Election Record — E-TCRRA1

- question: 260719-tally-choice-ruling(#1261)RA Q1: choice 勝者選出方式(tally の裁定導出)。

背景(RE 実測): tally(model.ts:321)は GoA favor/against のみで adopted/rejected を決め、choiceInternalNo を不参照(:334-335)。org.md の GoA 集計規則 (i)「1-3・6=賛成側として多数決」は本来 choice 別母集団に適用されるべきもの。E-GMEBT 実データ: choice2:2票 / choice1:1票(全票 GoA2)で正 = choice2(不採用)、現行 = adopted 誤描画。

各自コード実測のうえ GoA 付き投票。自案非採用時の受容度(6/7/8)を note に併記。

裁定: 採用
- 留保(e4, GoA2): GoA 4(棄権)票の choice は勝者選出の母集団から除外することを design で明文化すること — 規則 (v)『4 は定足数除外』との整合。A の『単純票数』を無条件全票と読むとこの既存規則と衝突する
- 留保(e2, GoA2): 棄権票の扱いを design で明文化すること — GoA 4(棄権)の ballot が持つ choice は勝者選出の母集団から除外する(org GoA 規則 (v)「4 は定足数除外」の choice 軸への一貫適用)。明文化しないと『棄権だが choice 欄は埋まっている』票の扱いが実装者判断に落ちる。
- 留保(e3, GoA2): GoA4(棄権)票は org 規則 (iv) の定足数除外と整合させ、choice 多数決の母集団からも除外することを要件文で明記する — A の『GoA は成立判定軸として分離』だけでは棄権票の choice が勝者選出に数えられる読みが残る。
票タイムライン: 配信 2026-07-19T22:42:51Z → 配信 2026-07-19T22:42:51Z → 配信 2026-07-19T22:42:51Z → e3 2026-07-19T22:44:10Z → e4 2026-07-19T22:44:15Z → e2 2026-07-19T22:44:20Z → 開票 2026-07-19T22:44:53Z
GoA[E-TCRRA1]: 1x0 2x3 3x0 4x0 5x0 6x0 7x0 8x0
