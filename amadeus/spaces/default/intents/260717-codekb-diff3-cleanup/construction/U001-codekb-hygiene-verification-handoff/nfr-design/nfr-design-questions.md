# NFR Design Questions — U001 CodeKB hygiene verification handoff

上流入力(consumes全数): `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`。

## 質問不要判定

質問は0件。2026-07-17T20:43:20Z、leaderがstanding grant `de2842f3` に基づき質問不要判定を承認した。

- Performanceはimmutable `MeasurementRef`から全数scanとtuple生成へ進むbounded local pipelineとし、cache / async / pool / CDNを追加しない。
- Securityはgit ref、same-SHA trace、tool-owned audit、valid gate、human landingをtrust boundaryとし、auth / encryption / AWS secret resourceを追加しない。
- Scalabilityは固定2 path、`O(N)` bounded scan、ref別immutable evidence setとし、load balancer / partition / autoscalingを追加しない。
- Reliabilityはfail-fast / fail-closed、partial result破棄、complete set再実行とし、remote call用circuit breaker / backoff / failover / backupを追加しない。
- Logical componentsはMeasurement Resolver、Content Scanner、Ancestry Verifier、Evidence Candidate Builder、Approval Boundary、Post-Landing Verifier、Close Handoffの7つの非deployable責務境界である。
- Functional Design Review Finding #5は、同一commitの再観測でも新しい`MeasurementAttempt(attemptId, observedAt, MeasurementRef(ref, SHA))`を明示する設計で閉じる。

## Ambiguity Analysis

曖昧なpattern選択、回答間矛盾、成果物生成に必要な欠落事項は0件。上記logical componentsはcode / service / infrastructureの追加を意味せず、既存git / record / human handoffの責務を分離するモデルである。本conductorはPR操作、main merge、Issue closeを行わない。

## Decision Provenance

| 項目 | 決定 | 根拠 |
|---|---|---|
| 質問数 | 0 | leader承認 2026-07-17T20:43:20Z、standing grant `de2842f3` |
| NFR pattern | bounded local evidence pipeline | `performance-requirements.md`、`scalability-requirements.md` |
| Trust / failure boundary | valid provenance + fail-closed | `security-requirements.md`、`reliability-requirements.md` |
| Technology / runtime | 既存stackのみ、新規deployable 0 | `tech-stack-decisions.md`、`business-logic-model.md` |
