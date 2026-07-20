# Election Record — E-FVEU3FD1

- question: 260720-formal-verif-experiment / U3 execution-evidence / functional-design。reviewer iteration1 NOT READY 4件を是正後、iteration2もNOT READY 3件（writer race、envelope改変検出、finding union不足）でreviewer_max_iterations=2に到達。stage-protocol §12aはiterations exhaustedならunresolved findingsを明記してapproval gateへ進むと規定し、per-unit gateは最終Unit後まで抑止される。iteration2後に承認済みscope内で、single-writer lock中head再確認+共通successor atomic rename、ledger coordinates+final envelope hash、Incomplete findings discriminator/cause追加まで最小是正済み。最新sensor全PASS・diff-check PASSだが第三review未実施。次の扱いを裁定する。

裁定: A. max-exhausted履歴を保持して次Unitへ進み最終FD gateで裁定(choice 1: 3票)
内訳: choice1=3票 choice2=0票 choice3=0票
- 留保(e2, GoA2): U3をREADYへ読み替えないこと。最終Functional Design gateではiteration 2の3 finding（writer race、envelope改変検出、finding union不足）、各最小是正へのfile:line写像、最新sensor PASS、第三review未実施を未解決findingとして明示し、人間がその状態を裁定できる形で提示すること。後続Unitの設計がU3契約へ依存する場合も、この未再review状態をconsumes側へ明記する。
- 留保(e1, GoA2): 最終Functional Design gateではU3をREADY扱いせず、iteration 2の未解決3 finding、上限到達後に行った3点の是正、第三review未実施を明示してstage全体として裁定すること。以後sensor失敗または承認scope逸脱が判明した場合は次Unit進行の根拠にせず停止する。
票タイムライン: 配信 2026-07-20T13:21:12Z → 配信 2026-07-20T13:21:12Z → 配信 2026-07-20T13:21:12Z → e4 2026-07-20T13:22:36Z(受理 2026-07-20T13:22:47Z) → e2 2026-07-20T13:22:37Z(受理 2026-07-20T13:22:58Z) → e1 2026-07-20T13:23:06Z(受理 2026-07-20T13:23:20Z) → 開票 2026-07-20T13:23:47Z
GoA[E-FVEU3FD1]: 1x1 2x2 3x0 4x0 5x0 6x0 7x0 8x0
