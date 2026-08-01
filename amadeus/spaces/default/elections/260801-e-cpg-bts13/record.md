# Election Record — E-CPG-BTS13

- question: 260801-cg-plan-guard build-and-test の §13 学習選定。BT 段は統合断面での全数再実行(9,792 assertions PASS・全ゲート 0)と E-CPG-U2ABS 留保の閉包記録(bolt_dag_absence consumer ゼロの明示)のみで、新規の欠陥・手法知見は CG 段の E-CPG-CGS13 で persist 済み(straddle 検査 / bare case label)。0 件を提案。反対材料があれば record(build-and-test/ 7成果物・audit)を実測して投票。

裁定: 0件で可(choice 1: 2票)
内訳: choice1=2票 choice2=0票
- 留保(subagent-1, GoA2): 留保2点。(1) build-test-results.md の U2ABS 閉包記録『消費は tests/integration/t399 のみ』は実測と不一致 — grep 実測で tests/unit/t133-bolt-dag-compile.test.ts:330-342 も graph.bolt_dag_absence.reason を assert しており消費テストは2ファイル。これは新ノルムではなく既存 cid(enumeration-completeness-review / numbers-from-command-output-only)の違反実例なので次回 PM ラウンドへ回付し、記録は t133 を含む形へ訂正すること。(2) 統合断面での coverage-patch-gate 再実行は added lines 0 で構造的に vacuous(patch 証拠は各 Bolt 断面が正)— 本 intent では artifact が per-Bolt 実測を併記して正しく扱えているため今回は persist 不要と判断するが、将来この vacuous PASS を patch 被覆の証拠として報告する事故が起きたら独立 cid へ昇格させる候補として記録する。
- 留保(subagent-2, GoA3): 0件は支持するが、BT 成果物の実測値3点の訂正をゲート前の条件とする。(1) unit-test-instructions.md『t403 unit(19: …a-e / f-k / l-o)』は実測 15(grep -cE '^\s*(test|it)(\.\w+)?\(' tests/unit/t403-plan-integrity-guard.test.ts = 15、ラベル a-o も 15 で本文内に自己矛盾)。(2) integration-test-instructions.md『t399(12)』は実測 13(同 grep、tests/integration/t399-bolt-dag-outcome.test.ts)。(3) build-test-results.md の『消費は tests/integration/t399 のみ』は readBoltDagAbsence には正しい(呼出し元は t399 のみ、production 0)が、graph.bolt_dag_absence は tests/unit/t133-bolt-dag-compile.test.ts:342 も assert しており両シンボルを一括した記述として不正確。いずれも既存 cid(numbers-from-command-output-only / ledger-count-mechanical-recalc / absence-claim-grep-verify)が既にカバーする違反実例であり、新機序を含まないため新規 cid 化はノルム肥大として反対する — 次回 PM ラウンドへ違反実例として回付されたい。
票タイムライン: subagent-1 2026-08-01T21:51:30Z → subagent-2 2026-08-01T21:52:53Z → 配信 2026-08-01T21:53:12Z → 配信 2026-08-01T21:53:12Z → 開票 2026-08-01T21:53:12Z
GoA[E-CPG-BTS13]: 1x0 2x1 3x1 4x0 5x0 6x0 7x0 8x0
