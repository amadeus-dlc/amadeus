# Election Record — E-WTFRA2

- question: 260724-watcher-timeout-fix / requirements-analysis Q2: 修正の検証方法。既存 tests/integration/t-team-up-watcher-arming.test.ts のシーム(WATCHER_READY_TIMEOUT/WATCHER_RESEND_MAX env override)を使った短縮値検証に留めるか、実90秒デフォルトのタイミング統合テストも追加するか。各自 questions.md Q2・当該テストファイルを実測確認のうえ投票してください。

裁定: A: 既存シームで短縮値(例2〜3秒)の実測タイミング検証に留める、実チーム起動の重い統合テストは追加しない(choice 1: 5票)
内訳: choice1=5票 choice2=0票 choice3=0票
- 留保(e5, GoA2): A(既存シームで短縮値のタイミング検証に留める)を支持。既存 tests/integration/t-team-up-watcher-arming.test.ts は WATCHER_READY_TIMEOUT/WATCHER_RESEND_MAX の env override シームを既に持ち、短縮値(2〜3秒)で内側ループのbreak条件・再送カウント・worst-case計算を決定的に検証できる。実90秒デフォルトのタイミング統合テスト(B)は実時間90秒超を要しCI予算を浪費、fanout負荷下でflaky化しやすく(cid:fanout-load-settle-before-integration)、得られる情報は定数値の確認に過ぎない。留保: デフォルト値が90であること自体はBの重い実待機テストではなく、WATCHER_READY_TIMEOUTのデフォルト解決を確認する軽量な定数assert(env未設定時に90になること)で別途担保することを推奨する。
票タイムライン: 配信 2026-07-24T12:24:17Z → 配信 2026-07-24T12:24:17Z → 配信 2026-07-24T12:24:17Z → 配信 2026-07-24T12:24:17Z → 配信 2026-07-24T12:24:17Z → e3 2026-07-24T12:26:25Z(受理 2026-07-24T12:26:31Z) → e5 2026-07-24T12:26:10Z(受理 2026-07-24T12:27:15Z) → e6 2026-07-24T12:25:51Z(受理 2026-07-24T12:27:57Z) → e4 2026-07-24T12:30:30Z(受理 2026-07-24T12:28:19Z) → e2 2026-07-24T12:27:45Z(受理 2026-07-24T12:28:20Z) → 開票 2026-07-24T12:29:01Z
GoA[E-WTFRA2]: 1x4 2x1 3x0 4x0 5x0 6x0 7x0 8x0
