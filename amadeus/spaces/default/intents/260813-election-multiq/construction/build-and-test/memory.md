<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
- 2026-08-14T07:32:00Z — Comprehensive strategy でも NFR-2 の 30-run p95 は包装差分だけでは薄いので、未実施なら未検証面として残し BLOCKER にしない。repo-wide `test:ci` の U8 外失敗も同じ扱い。

## Deviations
- 2026-08-14T07:35:00Z — Step 10 は Intent focused suite を先に完走した。repo-wide `test:ci` と NFR-2 p95 は未検証面に残し、U8 外失敗を BLOCKER にしない。

## Tradeoffs
- 2026-08-14T07:45:00Z — complexity NEW_VIOLATION のうち evaluateReportFormat だけ抽出し、v2 CLI/store と rebase 由来 plugin は baseline へ載せた。parseDirective を 15 未満にする改修は B&T の範囲を超える。

## Open questions
- 2026-08-14T08:00:00Z — B&T 承認は FormalElection TLC NOT_DETECTED のあと plugin-activation record で spec-change hold を外してから通った。次の tla-authoring / formal-model-check 本体が登録モデル全体を再確認する。
