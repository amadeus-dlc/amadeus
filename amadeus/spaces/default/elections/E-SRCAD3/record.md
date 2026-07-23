# Election Record — E-SRCAD3

- question: intent 260722-space-record-catalog / application-design の設計判断(verbatim 正本 = e2 ブランチ <record>/inception/application-design/application-design-questions.md、コミット bb07b2751 — git show で実測可)。Q3. drift 検出の fail 挙動。判断点: 移行前の既存103件は「レジストリ不在」state であり B/C は移行完了まで全 doctor 実行が赤(導入順序カップリング)。A は導入と移行を分離。 各自実測確認のうえ、A/B/C 選択型につき自案非採用時の受容度1行併記+GoA 付きで投票。

裁定: A. advisory 開始(pass:true+label 畳み込み、既存 doctor 慣行整合。hard 化は将来判断)(choice 1: 3票)
内訳: choice1=3票 choice2=0票 choice3=0票 choice4=0票
票タイムライン: 配信 2026-07-22T23:44:14Z → 配信 2026-07-22T23:44:14Z → 配信 2026-07-22T23:44:14Z → e3 2026-07-22T23:45:38Z(受理 2026-07-22T23:45:59Z) → e4 2026-07-22T23:47:08Z → e5 2026-07-22T23:45:38Z(受理 2026-07-23T00:30:14Z) → 開票 2026-07-23T00:30:24Z
GoA[E-SRCAD3]: 1x3 2x0 3x0 4x0 5x0 6x0 7x0 8x0
