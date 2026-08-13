# Election Record — E-260813-RECORD-BUNDLING-NORM

- question: ノルム矛盾監査: team.md Way of Working は「短命ブランチから Bolt ごとに PR を出してスカッシュマージし、複数ユニット・工程記録・無関係なリファクタを束ねない」と定めるが、(a) pr-convergence CLI の create 前提は record が head checkout 内に実在し checked-out branch == head であることを要求し(plugins/pr-convergence/tools/pr-convergence-cli.ts の verifyCreatePrerequisites: cwd = --record、resolveIntentReference が record 隣接の intents.json を読む)、(b) 先例 PR #2920(260812-tla-proof-receipt の Bolt PR)は record 18 ファイルを同梱してマージ済み、(c) 本 intent の PR #2986 も先例に従い record 同梱で作成・マージ済み。文言と実践・CLI 構造が矛盾している。どう整理するか。

裁定: team.md 文言を実践へ整合させる(choice 1: 2票)
内訳: choice1=2票 choice2=0票 choice3=0票
- 留保(subagent-1, GoA2): 是正は team.md:35 だけでは閉じない。同一文言が project.md:12 (cid:units-generation:c1) にも '複数ユニット・工程記録・無関係リファクタを単一 PR に束ねない' として存在するため、両方を同じ変更で是正しないと矛盾が残る。また是正文言は '自 intent の record' に限定し、他 intent の record・複数ユニット・無関係リファクタの束ね禁止は字義どおり維持すべき。
- 留保(subagent-2, GoA2): team.md 35行目と同一趣旨の文言が project.md 12行目 (cid:units-generation:c1) にも存在する(『複数ユニット・工程記録・無関係リファクタを単一 PR に束ねない』)。team.md だけを是正すると矛盾が project.md へ移るだけなので、同一 PR で両方を是正することを条件とする。
票タイムライン: 配信 2026-08-13T22:38:40Z → 配信 2026-08-13T22:38:40Z → subagent-1 2026-08-13T22:40:26Z → subagent-2 2026-08-13T22:40:36Z → 開票 2026-08-13T22:40:51Z
GoA[E-260813-RECORD-BUNDLING-NORM]: 1x0 2x2 3x0 4x0 5x0 6x0 7x0 8x0
