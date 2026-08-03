# Election Record — E-RRP-CG2

- question: 260802-record-roundtrip-pbt / Bolt 6(pbt-deep-ci)の実装前停止裁定。builder は設計指定の実行コマンド(BR-PDC-7 / services.md S2 = `AMADEUS_PBT_DEEP=1 bun test <paths>`)が赤になることを実測して停止した。事実: 対象集合 DECLARED=5/EXISTING=5(t416/t417/t418/t419/t274)、深掘り実行で t417 の P-EL2(実 FS の integration property)が 5384.69ms かかり `bun test` 直接起動の per-test 既定 5000ms を超過して失敗(3回連続で決定的再現、real 8.51/8.24/8.26)。反例ではなくランナーのタイムアウト。`--timeout=30000` を付すと 36 pass/0 fail/exit 0(3回とも real 8.2 前後)。機序: このリポの正準ランナー tests/run-tests.ts:59 `const DEFAULT_TEST_TIMEOUT_MS = 30_000;` が :663 で全 `bun test` 起動へ 30000ms を渡しており、ランナーを介さず直接叩く本ジョブだけが 5000ms 既定を継承する。設計自身が business-logic-model §2.3 / performance-design §2.3 で「実 FS を触る tests/integration 層の深掘り実測は本ステージ時点で 1 件も存在しない」と未実測を明記しており、実装段へ委ねられた実測に該当する。判断材料を実測(builder worktree /Users/j5ik2o/Sources/j5ik2o.github.com/amadeus-dlc/amadeus/.amadeus/worktrees/bolt-pbt-deep-ci はリードオンリー参照可、tests/run-tests.ts:59/:663 の実文、同 worktree 内の未追跡設計コピー construction/pbt-deep-ci/functional-design/business-rules.md の BR-PDC-7/12/13、services.md S2)して投票せよ。GoA 明記、2/3/6 は留保1文。

裁定: A: 深掘りジョブの bun test へ --timeout=30000 を付す(ci.yml のみ・U5 所在内。値は run-tests.ts:59 の既存定数と逐語一致)(choice 1: 2票)
内訳: choice1=2票 choice2=0票 choice3=0票 choice4=0票
- 留保(subagent-1, GoA2): A は S2/BR-PDC-7 の実行コマンド文字列に無いフラグを1個足すため、ci.yml のジョブ直上コメントへ「run-tests.ts:59 DEFAULT_TEST_TIMEOUT_MS=30_000 と逐語一致・ランナー非経由の 5000ms 既定を打ち消す環境差吸収であり深掘り予算/対象集合は不変」と申告付きで明記すること、および BR-PDC-8 の timeout-minutes を本実測 wall clock(約8.6秒)+setup から導出することを条件とする。
- 留保(subagent-2, GoA2): ci.yml の --timeout=30000 には由来コメント(tests/run-tests.ts:59 の DEFAULT_TEST_TIMEOUT_MS と逐語一致である旨、および P-EL2 の実測 5.4-5.6s / 30s cap の余裕)を必ず併記し、値が根拠なきマジックナンバーに見えない形で着地させること。
票タイムライン: 配信 2026-08-03T05:29:39Z → 配信 2026-08-03T05:29:39Z → subagent-1 2026-08-03T05:32:32Z(受理 2026-08-03T05:32:35Z) → subagent-2 2026-08-03T00:00:00Z(受理 2026-08-03T05:33:08Z) → 開票 2026-08-03T05:33:36Z
GoA[E-RRP-CG2]: 1x0 2x2 3x0 4x0 5x0 6x0 7x0 8x0
