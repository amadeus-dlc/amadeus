# Election Record — E-USSU10FD2

- question: 260720-upstream-sync-230 / U10 plugin-composition / functional-design。host/record/audit三面atomicityの正準方式を裁定する。Iteration 1 reviewerは、handled failureだけでなくprocess crash・commit途中でも三面不変を満たす回復方式が未定義というblocking findingを報告した。成果物・上流契約・NFR-2を独立実測して選択する。

裁定: workspace lock下のtransaction journalと全preimageでwrite-setを管理し、handled failureは即時復元、crashは次操作前にpre-stateへ回復(choice 1: 3票)
内訳: choice1=3票 choice2=0票 choice3=0票
- 留保(e2, GoA2): journalは最初のcanonical mutation前に全write-set/preimageとPREPARED状態をdurable化し、host/record/audit完了後だけCOMMITTEDへ遷移すること。次操作はlock取得後に未完了journalを検出し、current/preimage整合を検証して冪等にpre-stateへ回復する。回復中のdrift/corruptionは追加mutationせずloud停止するcrash-point全数fixtureを必須とする。
- 留保(e1, GoA2): journalは最初のcanonical mutation前に同一workspace lock下でdurableに確定し、transaction id、phase、host/record/auditの全write-setとpreimageを保持すること。回復は同じlock下でidempotentにpre-stateへ収束し、未回復journalがある間は新規compose/dropを開始しないこと。
票タイムライン: 配信 2026-07-20T14:28:40Z → 配信 2026-07-20T14:28:40Z → 配信 2026-07-20T14:28:40Z → e2 2026-07-20T14:29:20Z(受理 2026-07-20T14:29:39Z) → e1 2026-07-20T14:29:56Z(受理 2026-07-20T14:30:29Z) → e3 2026-07-20T14:30:25Z(受理 2026-07-20T14:30:42Z) → 開票 2026-07-20T14:30:54Z
GoA[E-USSU10FD2]: 1x1 2x2 3x0 4x0 5x0 6x0 7x0 8x0
