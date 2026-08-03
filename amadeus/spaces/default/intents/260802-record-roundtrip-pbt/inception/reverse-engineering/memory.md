<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->

## Interpretations
- 2026-08-02T16:44:20Z — cid:reverse-engineering:c1-xrev-scan-mode(バグバッチ向け)を単発のクロスレビュー済み enhancement Issue #1980 へ適用した; レビュー2名の verdict(対象 SHA 8e5dc6c4、HEAD 祖先)を Developer scan の一次入力とし、conductor の verbatim スポット再実測+患部10パスの区間 touch 判定(実質変更 2 パスのみ、いずれも患部外変更)で二重化した。適用免除条件(引用が observed 一致 SHA で検証済み)は行シフト再解決表の作成で充足。
- 2026-08-02T16:44:20Z — observed commit は origin/main tip(0fbd34eed、metrics 2 commits 先行)でなく merge-base(HEAD, origin/main) = 9750f8aea を採用; cid:reverse-engineering:c2-observed-mainline-commit の「origin/main 系譜かつ HEAD 祖先」を字義充足する最近点で、metrics スナップショットのみの先行分は患部に無関係。
- 2026-08-02T16:57:26Z — 宣言センサー3種(required-sections/upstream-coverage/answer-evidence)は codekb 出力パスが sensor filter に構造不適合のため不適用(cid:reverse-engineering:re-sensors-codekb-filter-mismatch); 代替証拠 = conductor 手動検証: 9 produces + re-scans 全件実在(ls)、降格後の「現在」マーカー各1件(grep -c 8/8)、鮮度ポインタ現在見出し1件、新規引用のスポット裏取り(amadeus-state.ts:248/:257/:270 は throw メッセージ実文行の verbatim 引用と確認、manifest.ts:53・setField no-op 実読一致)。§13 は E-RRP-RES13(2-0、c1 のみ採用)で成立し persist 済み(rule_learned:1)。
