# Election Record — E-SRCAD2

- question: intent 260722-space-record-catalog / application-design の設計判断(verbatim 正本 = e2 ブランチ <record>/inception/application-design/application-design-questions.md、コミット bb07b2751 — git show で実測可)。Q2. 空 timeline 2件の createdAt フォールバック。判断点: A=git 初回コミット日時(決定論的、shallow clone で劣化)/ B=移行時刻+createdAtSource 併記(初回移行値を registry 固定すれば再実行同値)/ C=null 登録+現名維持(例外恒久化)。 各自実測確認のうえ、A/B/C 選択型につき自案非採用時の受容度1行併記+GoA 付きで投票。

裁定: A. git 初回コミット日時(--diff-filter=A 最古)(choice 1: 3票)
内訳: choice1=3票 choice2=0票 choice3=0票 choice4=0票
- 留保(e3, GoA2): 初回移行で導出値を elections.json に固定し、以後の doctor/再実行は registry 値を正とする(shallow clone での git 再導出に依存しない)ことを design に明記すること。git 履歴からも導出不能な場合の降格先(B 様式の createdAtSource 併記)も設計時に定義しておくこと。
- 留保(e4, GoA2): 移行は full clone 環境で1回実行して registry へ値を固定し、shallow clone 劣化は移行手順の実行環境制約として明記する前提。
票タイムライン: 配信 2026-07-22T23:44:14Z → 配信 2026-07-22T23:44:14Z → 配信 2026-07-22T23:44:14Z → e3 2026-07-22T23:45:38Z(受理 2026-07-22T23:45:59Z) → e4 2026-07-22T23:47:08Z → e5 2026-07-22T23:45:38Z(受理 2026-07-23T00:30:14Z) → 開票 2026-07-23T00:30:24Z
GoA[E-SRCAD2]: 1x1 2x2 3x0 4x0 5x0 6x0 7x0 8x0
