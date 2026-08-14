# Risk and Sequencing Rationale — Election CLI 多問対応

## Basis and heuristic

[requirements](../requirements-analysis/requirements.md)、[components](../application-design/components.md)、[unit-of-work](../units-generation/unit-of-work.md)、[unit-of-work-dependency](../units-generation/unit-of-work-dependency.md)、[unit-of-work-story-map](../units-generation/unit-of-work-story-map.md) を根拠とする。Reinertsen/SAFeのWSJF点数は、全unitが同じIssueの必須scopeでbusiness value/time criticalityの独立データがないため使用しない。risk-firstを採用し、DAGを満たす範囲で最も破壊半径の大きい信頼境界を先に固定する。

## Risk register

| ID | Risk | Likelihood | Impact | Earliest Bolt | Mitigation / evidence |
|---|---|---|---|---|---|
| R1 | legacy/new question identityが再読込・migrationで変わる | Medium | Critical | B1 | `legacy-question`、canonical digest、round-trip/PBT |
| R2 | voter×question解決が旧voter-only amendと混ざる | High | High | B2 | pure resolver、duplicate/coverage reject、property tests |
| R3 | mixed snapshot更新でestablished resultが変化する | Medium | Critical | B2 | preserved digest、immutable run、history fold verify |
| R4 | history writeとcurrent snapshot更新の途中失敗 | Medium | High | B2 | runId idempotency、same-content repair、conflict reject |
| R5 | CLI 853行へ条件分岐が集中しspaghetti化する | High | High | B3 | domain policyをU1/U2、persistenceをU3へ置く。CLIはorchestrationのみ |
| R6 | record/transportでquestion attributionが失われる | Medium | High | B3 | question ID sections、blind view keys、independent verify |
| R7 | legacy migrationは通るがcanonical meaningが変わる | Medium | High | B4 | before/after digest、dry-run、legacy/new corpus |
| R8 | FormalElectionと実装identityがdriftする | Medium | High | B4 | TLC receipt、model completeness、model-map update |
| R9 | 単問performance/behaviorが退行する | Medium | High | B5 | baseline/treatment p95、canonical result/record comparison |
| R10 | generated distributionやnormがsourceに追従しない | Medium | High | B5 | isolated builds、source-only、skill projection、memory scan |

## Why this sequence

1. B1はすべてのdata contractのsourceで、ここが不安定だと後続の実装とtest oracleが同時に揺れる。
2. B2はdomain correctnessとdurabilityをCLIから独立に反証し、最大のdata-safety riskを早期に閉じる。
3. B3は安定した下位contract上でend-to-end valueを初めて示す。risk-firstのためwalking skeletonを最初に置かない。
4. B4はCLI behaviorと独立なmigration/formal evidenceを追加する。U6/U7は相互依存せず、同一Bolt内で非交差なら並行可能。
5. B5は全source contractが確定した後にprojection、full regression、performance、normを一度だけ収束させる。

## DAG conformance

Bolt bundle内のdirect dependencyは同Bolt内で依存先を先に成立させる。B1→B2→B3→B4→B5は `unit-of-work-dependency` の全edgeを満たし、topological deviationはない。risk-firstはDAG順を破るためではなく、許可された複数pathからこのpathを選ぶ判断として使用する。

## Go / no-go

- **Go:** Bolt DoDの必須tests/gatesがpass、unresolved BLOCKER 0、次Boltのdirect prerequisitesがDone。
- **No-go:** data loss、established digest差異、decode fail-open、model identity不一致、coverage/build gate失敗。
- **Conditional retry:** constrained VMの既知cold timeoutだけは該当fileをraised timeoutで単独再実行し、passした証拠を併記する。
