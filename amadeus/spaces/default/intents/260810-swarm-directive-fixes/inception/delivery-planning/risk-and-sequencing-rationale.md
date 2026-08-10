# Risk and Sequencing Rationale

入力: [`requirements.md`](../requirements-analysis/requirements.md)、[`components.md`](../application-design/components.md)、[`unit-of-work.md`](../units-generation/unit-of-work.md)、[`unit-of-work-dependency.md`](../units-generation/unit-of-work-dependency.md)、[`unit-of-work-story-map.md`](../units-generation/unit-of-work-story-map.md)。Stories / mockups / team-practices は本 scope で非実行。

## Heuristic

risk-firstを採用する。#2833はP1/S2-CRITICALで停止不能ループを生み、#2834はP2/S3-MAJORでdownstream inputをsilent dropする。両方を早期並行実装する一方、walking-skeleton gate / convergence / merge approvalは#2833を先行する。

| Bolt | Severity / urgency | Risk reduction | Size | Sequence implication |
|---|---|---|---|---|
| Bolt 1 #2833 | P1 / S2 | terminal transitionとselector ledgerを閉じる | L | gate 1、walking skeleton |
| Bolt 2 #2834 | P2 / S3 | 7 consumer / 19 edgeとreviewer fail-openを閉じる | L | parallel build、gate 2 |

formal WSJF scoreは使わない。business valueを擬似数値化するより、既存Issue priority/severityと停止不能性を一次根拠にする。

## Walking Skeleton Exception

self-featureのfirst Bolt walking-skeleton gateはBolt 1へ維持する。通常の「Bolt 1を単独実行」は、ユーザーの明示的なConstruction swarm並行化要求と2026-08-10裁定により、今回intentに限ってBolt 2の並行**実装**を許す。承認順序は緩和せず、Bolt 2はBolt 1より先にgate/mergeしない。

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| shared orchestrator same-hunk conflict | Medium | High | semantic ownership、検出時停止、実競合時だけU2 rebase/update |
| stale audit correlationで別attempt抑止 | Medium | Critical | UnitKey/canonical seq/conflict fail-closed table tests |
| fan-outの一部stageだけ修正 | Medium | High | 7 consumer / 19 edge mechanical inventory test |
| placeholder契約の全面改訂 | Low | High | `t116`/`t186` pinと限定revision |
| parallel coverage/audit output破壊 | Medium | High | full/coverage/merge verification single owner |
| PR2がPR1 gateを追い越す | Low | High | conductor hold、leader承認順序、PR report interrupt |

## Dependency and Topology Validation

`unit-of-work-dependency.md` は2 nodes / 0 technical edgesで、同時swarm dispatchはtopologyに適合する。gate / convergence順序 U1→U2 は技術dependencyではなく、risk-firstとwalking-skeletonを満たすdelivery policyである。
