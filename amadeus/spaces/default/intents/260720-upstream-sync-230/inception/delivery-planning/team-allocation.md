# Team Allocation — upstream-sync-230

> 上流入力(consumes 全数): `requirements.md`、`components.md`、`unit-of-work.md`、`unit-of-work-dependency.md`、`unit-of-work-story-map.md`、`team-practices.md`。`stories.md` / `mockups.md` は本 scope で SKIP 済み。

team-formationは本scopeでSKIPのため、存在しないnamed mobや人員を捏造しない。全Boltのbuilder ownerは `amadeus-developer-agent`。stage directiveの専門reviewerと、必要時のarchitect/quality/harness観点をreview gateへ割り当てる。

## Bolt-to-agent allocation

| Bolt | Unit | Builder owner | 必須review観点 |
|---:|---|---|---|
| 1 | stage-contract | amadeus-developer-agent | architect: shared vocabulary/DAG、quality: fail-closed fixtures |
| 2 | runtime-recovery | amadeus-developer-agent | architect: state/audit idempotence、quality: recovery negative |
| 3 | plugin-projection | amadeus-developer-agent | architect: ownership/6対4、quality: drift/orphan |
| 4 | plugin-composition | amadeus-developer-agent | architect: transaction/no-clobber、quality: failure 0 mutation |
| 5 | reference-plugin-and-guides | amadeus-developer-agent | architect+quality: e2e closure、docs pair/deferred境界 |
| 6 | harness-hook-correctness | amadeus-developer-agent | harness別payload/command、quality:6面fixture |
| 7 | swarm-and-next-stage | amadeus-developer-agent | architect: DAG/current run、quality: characterization |
| 8 | routing-and-autonomy-guards | amadeus-developer-agent | architect: mutation boundary、quality: stale/guard negative |
| 9 | unit-iteration-and-scope-preview | amadeus-developer-agent | architect: default compatibility、quality: grid matrix |
| 10 | workspace-inspection | amadeus-developer-agent | architect: read-only boundary、quality: filesystem fixtures |
| 11 | reviewer-protocol | amadeus-developer-agent | architecture reviewer: self-scope、quality: allow-list fixture |
| 12 | verification-and-ledger-closure | amadeus-developer-agent | quality: full gates/coverage、leader: ledger/最終SHA |

## Parallel capacity and ownership rules

- Bolt 1–5はprogressive skeletonのため直列。各plugin Unitは別branch/PR/rollback boundary。
- Wave 2はBolt 6–9を最大4 builder、Wave 3はBolt 10–11を最大2 builderで並行可能。
- builder slotが不足する場合はwave内で待機する。正しさは同時実行数に依存しない。
- 同じcanonical型を複数Unitが触る場合はowner Unitの定義を逐語参照し、独立再定義しない。
- PR mergeは人間承認後にleaderのみが行い、squash merge後に次の依存Boltを解禁する。

## Handoff and escalation

- 未決仕様、contract変更、DAG変更、plugin 4独立境界の緩和はbuilderが単独決定せず選挙へ戻す。
- Bolt 5 e2e closure不成立時はBolt 6以降へ進めず、U01/U02/U09/U10/U11のどのcontractが反証されたかを記録する。
- 外部team handoffはない。TLC/JVM等、本intent scope外のruntime導入もない。
