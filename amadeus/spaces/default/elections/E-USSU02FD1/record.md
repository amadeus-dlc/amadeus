# Election Record — E-USSU02FD1

- question: 260720-upstream-sync-230 / U02 runtime-recovery / functional-design。reviewerが現設計の逐次audit emitと承認済み契約の衝突を検出した。実コードではamadeus-state.tsのemitAuditがlock内でappendAuditEntryUnlockedを各行ごとに呼び、amadeus-audit.tsのwithAuditLockは直列化のみで複数appendの原子性を提供しない。recovered GATE_REJECTED→STAGE_REVISING→STAGE_AWAITING_APPROVAL→通常GATE_APPROVED→STAGE_COMPLETEDの途中でappend失敗するとpartial auditが残り、Q&Aのrecovery失敗時no partial state/auditおよびNFR-2に反する。どの契約で閉じるか。

裁定: A. 5行を単一batch appendし成功後stateを1回write(choice 1: 3票)
内訳: choice1=3票 choice2=0票 choice3=0票
- 留保(e2, GoA2): Aの『単一batch append』は5 blockを全てメモリ上で生成・検証してから1回の監査commitとして扱い、単なる5回emitの同一lock化やpartial writeを許容するappendFileSync 1回への言い換えにしないこと。append失敗時にaudit/state双方を呼出前bytesへ戻す仕組みと、batch成功後のstate write失敗時の再実行・重複防止契約をfailure injectionで固定すること。
票タイムライン: 配信 2026-07-20T11:51:58Z → 配信 2026-07-20T11:51:58Z → 配信 2026-07-20T11:51:58Z → e3 2026-07-20T11:52:43Z(受理 2026-07-20T11:53:05Z) → e2 2026-07-20T11:53:16Z(受理 2026-07-20T11:53:31Z) → e1 2026-07-20T11:53:09Z(受理 2026-07-20T11:53:33Z) → 開票 2026-07-20T11:54:08Z
GoA[E-USSU02FD1]: 1x2 2x1 3x0 4x0 5x0 6x0 7x0 8x0
