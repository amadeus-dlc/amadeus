# Election Record — E-OTELBT-S13

- question: 260729-otel-upstream build-and-test ステージの §13 学習選定。conductor 提案: 0件(本ステージは着地済み実測の編纂と fresh 再実行が主で、t258 hang-guard 300s 化は既存ノルム(bt-timeout-verification-shape / observability-setup:c3 の timeout≠SLO)の適用であり新規規則を生まない。stage diary のエントリも0件)。各自、construction/build-and-test/ の7成果物と diary(memory.md)を独立確認し、独自の学習候補が実在しないかを検分して投票せよ。選択肢: 0件で可 / 異議(候補あり — rationale に候補文を書くこと)。

裁定: 0件で可(choice 1: 2票)
内訳: choice1=2票 choice2=0票
- 留保(subagent-2, GoA2): t258 の inline timeout を 120s→300s とした際の知見、すなわち『hang guard の値を実測 wall-clock レンジ(GitHub runner 実測 123-152s)の直上に置くと、全予算アサーションが green のまま timeout だけが発火し、性能退行と区別不能な偽赤を作る — hang guard は丸め値でなく実測レンジから離して定める』は、既存の bt-timeout-verification-shape(timeout 要件の検証形)にも observability-setup:c3(timeout≠SLO)にも rerun-red-reattribution(赤の再帰属)にも被覆されない実ギャップだと考える(tests/integration/t258-lifecycle-transaction.test.ts:529-536 のコメントが #1830 経路A・PR #1844 の4連続赤を根拠として明記)。ただし当該変更は本ステージではなく writer-deletion Bolt の code-generation(着地 5d912e0dd / PR #1844)で行われたもので、その §13 は E-OTELCG-S13B として 2026-07-31T12:33:59Z に既に閉じている。build-and-test の学習として persist するとステージ帰属を誤るため本選挙では 0件を支持し、この知見は週次蒸留ラウンドで独立に諮ることを推奨する。採否には影響しない。
票タイムライン: 配信 2026-07-31T12:46:08Z → 配信 2026-07-31T12:46:08Z → subagent-1 2026-07-31T12:47:51Z → subagent-2 2026-07-31T12:52:00Z(受理 2026-07-31T12:49:01Z) → 開票 2026-07-31T12:49:21Z
GoA[E-OTELBT-S13]: 1x1 2x1 3x0 4x0 5x0 6x0 7x0 8x0
