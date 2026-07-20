# Election Record — E-TCRCG

- question: 260719-tally-choice-ruling(#1261)CG の宣言逸脱裁定(builder は実装前停止・コード0行・ブランチ無変更保持中)。ギャップ: plan の「outcome 二値廃止・winner 正」を適用すると、handleRender(scripts/amadeus-election.ts:378-386)の人間 hold 裁定合成(HOLD_RESOLUTIONS :69-71 の adopted/rejected は choice-blind な二値)が型不正になり、winner 専用 rulingText では人間解決 hold の裁定行(t236:309-310 が『裁定: 不採用』を期待)を描画できない — E-TCRRA 裁定は tally 自動集計の choice 化を定めたが、人間裁定経路の表現形は未裁定。各自コード実測のうえ GoA 付き投票。自案非採用時の受容度を note に併記。注: B は HOLD_RESOLUTIONS・t236 期待変更 = ユーザー可視契約の変更につき、採用多数でも正準リスト(4)のユーザーエスカレーションを経て確定する。

裁定: 採用
- 留保(e4, GoA2): A 採用時、多肢 choice の tie 由来 hold を人間が解決するケースで二値語彙(adopted/rejected)が『どの choice が勝者か』を表現できないギャップの追跡 Issue を起票すること(E-TCRRA2=A で choice tie→hold が正規経路になったため、この表現ギャップは将来必ず顕在化する — 発見時点の記録を遅らせないノルムに従う)
票タイムライン: 配信 2026-07-19T23:11:42Z → 配信 2026-07-19T23:11:42Z → 配信 2026-07-19T23:11:42Z → e3 2026-07-19T23:12:22Z → e2 2026-07-19T23:12:34Z → e4 2026-07-19T23:12:42Z → 開票 2026-07-19T23:12:50Z
GoA[E-TCRCG]: 1x2 2x1 3x0 4x0 5x0 6x0 7x0 8x0
