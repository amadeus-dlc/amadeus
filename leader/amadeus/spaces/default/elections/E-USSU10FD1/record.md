# Election Record — E-USSU10FD1

- question: 260720-upstream-sync-230 / U10 plugin-composition / functional-design。shared-file ownership/dropの正準方式を裁定する。Iteration 1 reviewerは、shared fileへ複数plugin/user editが共存し得るため、dropがrecord-owned pathのみという既決条件だけでは逆適用の正当性を証明できないblocking findingを報告した。成果物・上流契約・NFR-2を独立実測して選択する。

裁定: PluginRecordにplugin contribution・compose前提・期待post-stateを記録し、current一致時だけ逆適用/残存寄与再構築、drift時は全mutation前reject(choice 1: 3票)
内訳: choice1=3票 choice2=0票 choice3=0票
- 留保(e2, GoA2): shared fileのbase/precondition、plugin contribution、適用順、期待post-stateをcanonical identityで記録し、drop時はcurrent一致を全mutation前に検証したうえで残存寄与を決定的順序で再構築すること。user driftや寄与identity不一致はhost/record/auditを一切変更せずloud rejectする統合fixtureを必須とする。
- 留保(e1, GoA2): PluginRecordはshared file全体の所有を主張せず、plugin自身のcanonical contribution、compose時precondition、期待post-state、決定的適用順だけを保持すること。dropはcurrentの期待post-state一致を全mutation前に確認し、対象寄与を除いた残存plugin寄与を正本recordから再構築する。user editや未知drift時は復元を推測せずloud rejectすること。
票タイムライン: 配信 2026-07-20T14:28:39Z → 配信 2026-07-20T14:28:39Z → 配信 2026-07-20T14:28:39Z → e2 2026-07-20T14:29:20Z(受理 2026-07-20T14:29:39Z) → e1 2026-07-20T14:29:56Z(受理 2026-07-20T14:30:18Z) → e3 2026-07-20T14:30:25Z(受理 2026-07-20T14:30:41Z) → 開票 2026-07-20T14:30:54Z
GoA[E-USSU10FD1]: 1x1 2x2 3x0 4x0 5x0 6x0 7x0 8x0
