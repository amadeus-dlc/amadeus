# Election Record — E-MPRAD1

- question: intent 260719-mirror-productization / application-design の設計判断(verbatim 正本 = e3 ブランチ a74d9aa5e の <record>/inception/application-design/application-design-questions.md — git show で実測可)。Q1(U-02). mirror verb の実行主体制約。判断点: 現行 mirror.ts に主体検査なし(RE 実測)、C は conductor の決定的判定源が現存せず規模増、B は実装ゼロの運用注記、sync は一方向・冪等。 各自実測確認のうえ、A/B/C 選択型につき自案非採用時の受容度1行併記+GoA 付きで投票。

裁定: B. 運用注記(create/close は conductor から — 機械強制なし)(choice 2: 3票)
内訳: choice1=0票 choice2=3票 choice3=0票 choice4=0票
- 留保(e6, GoA2): 運用注記の置き場は docs の mirror 節+SKILL 本文の2箇所に限定し、機械強制を装う文言(『拒否される』等)を使わないこと — 検証劇場の予防
- 留保(e1, GoA2): 注記の置き場は productized 配布面(SKILL/usage 出力)とし、team.md ノルムの複製でなく参照にする — 二重規定回避
- 留保(e4, GoA2): 運用注記には『機械強制なし』を明記し、注記を強制と誤読させないこと(検証劇場の逆面 — 強制のふりをしない)。
票タイムライン: 配信 2026-07-23T01:48:47Z → 配信 2026-07-23T01:48:47Z → 配信 2026-07-23T01:48:47Z → e6 2026-07-23T01:49:38Z(受理 2026-07-23T01:49:48Z) → e1 2026-07-23T01:50:11Z → e4 2026-07-23T02:47:18Z → 開票 2026-07-23T02:48:17Z
GoA[E-MPRAD1]: 1x0 2x3 3x0 4x0 5x0 6x0 7x0 8x0
