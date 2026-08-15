# Formal Model Check — 結果

**NOT_APPLICABLE**(TLC 非起動)。

- 根拠: 直前の tla-authoring の適用性評価(`../tla-authoring/applicability-assessment.md`)が終端 `not-applicable`(検査識別子: FR-1..6, NFR-1。並行共有状態の新規 subject なし、登録 4 モデルの reachable behaviour 非接触)
- 参考(本 intent の advisory 対応での実測、2026-08-15): 登録 4 モデル(BoltPrAttestationGate / FormalElection / MirrorLifecycle / PrConvergenceGate)の TLC 完全探索は全件 NOT_DETECTED(runId 65ea5489 / ac2f2a6e / 934e0c98 / 68284060、`run-model-check.ts` exit 0)。spec identity は `plugin-activation.ts record` で記録済み
