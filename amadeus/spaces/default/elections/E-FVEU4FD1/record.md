# Election Record — E-FVEU4FD1

- question: 260720-formal-verif-experiment / U4 tla-arm-toolchain / functional-design。reviewer iteration1 NOT READY 4件を是正後、iteration2もNOT READY 3件（hold state/GoA式、複数invalid precedence、source span/queue proof）でreviewer_max_iterations=2に到達。stage-protocol §12aはiterations exhaustedならunresolved findingsを明記してapproval gateへ進むと規定し、per-unit gateは最終Unit後まで抑止される。iteration2後に承認済みscope内で、stateへのhold markers+TallyReceipt closed union、resolved GoA cardinality式+RecordHold条件、validation precedence UNKNOWN_CHOICE→INVALID_TIMESTAMP→UNKNOWN_REF、frozen invariant source map、CompleteExploration queue=0まで最小是正済み。最新sensor全PASS・diff-check PASSだが第三review未実施。U3の未READY依存も明示保持する。次の扱いを裁定する。

裁定: A. max-exhausted履歴を保持して次Unitへ進み最終FD gateで裁定(choice 1: 3票)
内訳: choice1=3票 choice2=0票 choice3=0票
- 留保(e2, GoA2): U4 を READY と再ラベルせず、最終 Functional Design ゲートで iteration 2 の未解決3所見、対応した正確な file:line、最新 sensor PASS、第三者再レビュー未実施を列挙すること。U3 の未解決依存も維持し、U4 契約を消費する後続 Unit は U3/U4 の max-exhausted・未再レビュー状態を明記して integration readiness を主張しないこと。
- 留保(e1, GoA2): 最終Functional Design gateではU4をREADY扱いせず、iteration 2の未解決3 finding、上限到達後の3点是正、第三review未実施、およびU3の未READY依存を明示してstage全体として裁定すること。以後sensor失敗または承認scope逸脱が判明した場合は停止する。
票タイムライン: e4 2026-07-20T13:39:28Z(受理 2026-07-20T13:39:43Z) → e2 2026-07-20T13:39:41Z(受理 2026-07-20T13:39:52Z) → e1 2026-07-20T13:39:39Z(受理 2026-07-20T13:39:52Z) → 開票 2026-07-20T13:39:58Z
GoA[E-FVEU4FD1]: 1x1 2x2 3x0 4x0 5x0 6x0 7x0 8x0
