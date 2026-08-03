# Scalability Requirements — convergence-budgets

上流入力（consumes 全数）: `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`

## Budget Cardinality と Growth

`requirements.md` FR-02〜04A、`business-logic-model.md` のBudgetSubject、`business-rules.md` BR-CB-01〜20、`technology-stack.md` の短命CLI／per-clone auditを前提とする。budget ownerは共有C2／C3のみで、harnessごとのcounter storeを増やさない。

| ID | Dimension | Target | Verification |
|---|---|---|---|
| SC-CB-01 | budget kinds | closed 6種 | stop／retry／question／follow-up／review／unit-attempt以外をversion更新なしに受理しない |
| SC-CB-02 | counter bound | 全時点で`0 <= value <= effectiveCap <= hardCap` | 各kindをcap+1まで生成するproperty test |
| SC-CB-03 | concurrent reserve | 同じsubjectへの4並行reserveで一意keyごとに1増分、重複keyは0増分 | 4 process／lock競合fixture |
| SC-CB-04 | subject lookup | fold後のreserve／lookupはO(1) | subject key indexを用い、subject数1／100／1,000で全scanを増やさない |
| SC-CB-05 | retry attempts | operationあたり自動retry最大3 | worker ID／session変更後も4回目のretry開始0 |
| SC-CB-06 | distribution | 7 package／影響5 self-install面で同一policy versionとhard cap | generated digest／conformance matrix未一致0 |

## Configuration Scaling

- `BudgetPolicyV1`はkindとmodeごとのdefault／hard capを一箇所で所有する。adapter別・model別・Codex別のcapを追加しない。
- 同じBudgetSubjectは初回policy snapshotをworkflow終了まで保持する。config reloadは新しいsubjectだけへ適用し、既存counterを移行・resetしない。
- hard capを超える設定、0以下、非整数、未知kind／versionはfail-closedとし、fallbackで大きな値を使わない。
- retry allowlistはv1で4行に固定し、source surfaceの増加をruntime discoveryで暗黙許可しない。

## Saturation と Backpressure

- canonical lock競合は既存の有界lock acquisitionへ従い、lock待ち失敗をrecoverable retryへ自己分類しない。
- stop-continuation exhausted時は新しい作業をqueueせず、現在のartifactとtermination summaryを人間へ返す。
- recoverable retry exhausted時は同じUnitを別worker IDで再queueして回避せず、後続pool policyへtyped failureを渡す。
- semantic convergence monitorはadvisory signalだけを出し、deterministic queue／counter capacityを変更しない。
