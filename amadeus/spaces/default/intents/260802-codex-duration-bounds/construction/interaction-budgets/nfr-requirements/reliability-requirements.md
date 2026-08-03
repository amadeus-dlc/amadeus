# Reliability Requirements — interaction-budgets

上流入力（consumes 全数）: `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`

## Interaction Correctness SLO

`requirements.md` NFR-01／02／07、`business-logic-model.md` のdelivery recovery、`business-rules.md` BR-IB-19〜26、`technology-stack.md` のfault injection seamを適用する。

| Invariant | Target |
|---|---|
| monotonic counters | decrement／reset 0件、常に`value <= hard cap` |
| idempotent replay | 同一semantic keyのcounter増分0 |
| question delivery | at-least-once、重複表示は同じinteraction ID |
| answer binding | 最初のfingerprint 1件、異fingerprintはconflict |
| review dispatch | at-most-once effect。unknown時は再送せずunavailable |
| terminal summary | exhausted／failed／unavailableごとにちょうど1件 |
| approval handoff | unresolved items、consumed/cap、last progress、next actionを100%保持 |

## Failure Handling と Verification

- render失敗、reviewer失敗も予約済み1回として消費し、counterを戻さない。
- review cap後は未解決BLOCKERだけを既存approvalへ渡し、FOLLOW-UP／NITで新reviewを開始しない。
- claimed後crash、delivery後commit前crash、answer reply前crash、review effect unknownをfault injectionする。
- cap-1／cap／cap+1をquestion／follow-up／reviewすべてで検証する。
- `BLOCKER | FOLLOW-UP | NIT`はclosed severityとし、再現可能な要求違反だけがBLOCKER。改善可能性だけでNOT-READYにしない。
- completenessは必須成果物、宣言済みverification、未解決BLOCKERの3条件で閉じ、完了時に追加探索しない。
