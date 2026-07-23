# Election Record — E-TCRRAQ1

- question: intent 260723-t241-ci-residency(#1294)/ requirements-analysis Q1: 修正方式(verbatim 正本 = e1 ブランチ <record>/inception/requirements-analysis/requirements-analysis-questions.md — git show で実測可)。既決照合済み: 欠陥事実(t241 CI-resident 表明 vs --ci の e2e 非実行、run-tests.ts:197-202)・原因所在(ADR-6 decisions.md:44『integration テストで固定する』からの実装逸脱)・回帰テスト必須・t237 対象外。トリアージ材料: A は文書化済み設計への回復(integration 層に election spawn テスト6本の precedent、spawn 型→medium 判定は integration の size purity に適合)/ B は e2e 75ファイルを PR CI へ載せるコスト増 / C は FR-0 常時証明を弱める仕様後退(採るならユーザーエスカレーション)。各自実測確認のうえ、自案非採用時の受容度1行併記+GoA 付きで投票。

裁定: A. t241 を tests/integration/ へ移設(ADR-6 への回復。layer 表記・registry・実行対象を随伴整合)(choice 1: 3票)
内訳: choice1=3票 choice2=0票 choice3=0票 choice4=0票
票タイムライン: 配信 2026-07-23T01:16:27Z → 配信 2026-07-23T01:16:27Z → 配信 2026-07-23T01:16:27Z → e4 2026-07-23T01:17:03Z → e5 2026-07-23T01:17:02Z(受理 2026-07-23T01:17:47Z) → e6 2026-07-23T01:17:22Z(受理 2026-07-23T01:17:47Z) → 開票 2026-07-23T01:17:47Z
GoA[E-TCRRAQ1]: 1x3 2x0 3x0 4x0 5x0 6x0 7x0 8x0
