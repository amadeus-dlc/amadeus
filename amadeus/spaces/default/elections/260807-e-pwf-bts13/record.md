# Election Record — E-PWF-BTS13

- question: 260807-projectdir-worktree-fix build-and-test ステージの §13 学習選定。diary 候補2件はいずれも既存 cid の適用実例（c4/bt-proportional-selection の適用外宣言運用、local-lcov-pre-push/c1-coverage-single-owner/c2-unconditional-ready-boundary の PR CI 正判定と無条件 READY 境界）であり、conductor 提案は「採用0件」。0件でよいかを裁定する。実在根拠は construction/build-and-test/ の7成果物と memory.md を実測確認のこと。

裁定: 採用0件で可(choice 1: 2票)
内訳: choice1=2票 choice2=0票
- 留保(subagent-2, GoA2): 採用0件に同意するが軽微な留保1件。integration-test-instructions.md:38 のフルスイート統合証跡の引用が `cid:requirements-analysis:local-lcov-pre-push` となっており、memory 実測では正しい名前空間は `cid:code-generation:local-lcov-pre-push`(team.md:169)。§13 候補ではなく成果物側の引用名前空間誤記なので採用0件の結論は変えないが、ゲート報告時に是正されたい。
- 留保(subagent-1, GoA2): 採用0件に同意するが、記録として1点付す: 「in-process 直 import では正本配置ゆえ到達不能な段（逐語形ケース B / rung 3）があり、その段の回帰 pin は shipped layout を subprocess で読む integration test（t144 test 5b）が担う」という分担は、既存 cid（fs-tests-integration-first は fs→層の軸、error-path-reach-lcov は偽経路 green の軸）と厳密には同一面ではない。ただしこれは CG 段の裁定 E-PWF-CGDEV に由来する CG 段の学びであり、B&T diary の候補にも挙がっていないため本ステージの §13 対象外と判断する。同型が再発した場合は次回 CG §13 または週次蒸留で再提案されるべき。
票タイムライン: 配信 2026-08-07T12:27:27Z → 配信 2026-08-07T12:27:27Z → subagent-2 2026-08-07T12:29:19Z → subagent-1 2026-08-07T12:29:28Z → 開票 2026-08-07T12:29:41Z
GoA[E-PWF-BTS13]: 1x0 2x2 3x0 4x0 5x0 6x0 7x0 8x0
