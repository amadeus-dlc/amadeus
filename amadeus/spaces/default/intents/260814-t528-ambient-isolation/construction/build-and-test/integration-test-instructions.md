# Integration Test Instructions — 260814-t528-ambient-isolation

> 上流: `code-summary.md` の検証表に基づく。t528 は integration tier(`.serial.` なしの並行帯)に常駐。

## 実行

- integration tier: `bash tests/run-tests.sh integration`
- 本 intent の対象: `tests/integration/t528-report-ack-kind.integration.test.ts`(7 テスト)

## 境界

- in-process `handleReport`/`handleNext` 駆動 + 実 spawn の `amadeus-state.ts`(既存機構、変更なし)
- fixture の autonomy 書込は production API(`mintHumanPresence` → `applyProductionAutonomyMode`)経由 — write⇔read の round-trip を実経路で通す
