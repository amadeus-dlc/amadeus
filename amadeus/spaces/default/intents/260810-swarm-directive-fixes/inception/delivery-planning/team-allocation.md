# Team Allocation

入力: [`requirements.md`](../requirements-analysis/requirements.md)、[`components.md`](../application-design/components.md)、[`unit-of-work.md`](../units-generation/unit-of-work.md)、[`unit-of-work-dependency.md`](../units-generation/unit-of-work-dependency.md)、[`unit-of-work-story-map.md`](../units-generation/unit-of-work-story-map.md)。Stories / mockups / team-practices は本 scope で非実行。

## Swarm Allocation

| Bolt | Unit / Issue | Worker | Source ownership | Reviewer / convergence |
|---|---|---|---|---|
| Bolt 1 | `issue-2833-failure-transition` / #2833 | amadeus-developer-agent worker A | outcome module、failure selector/halt/park semantic region、専用tests | stage reviewer + PR convergence、leader merge approval |
| Bolt 2 | `issue-2834-consume-fanout` / #2834 | amadeus-developer-agent worker B | fan-out module、reviewer guard、consume-resolution semantic region、専用tests | stage reviewer + PR convergence、leader merge approval |

Team Formationは本scopeで非実行のためAI-only mobとする。conductorはengine routing、swarm lifecycle、PR報告割込み、gate、parent leader worktreeへの承認伺いだけを所有する。

## Coordination Contract

- 両workerは同じbase SHAから専用worktree / branchを持ち、相手Unitのsemantic regionを変更しない。
- 同一hunk、共有barrel、runner登録、fixture、coverage台帳の競合が判明したら、実装を広げずconductorへ報告する。
- Bolt 1 PRを先に収束・承認する。Bolt 2はその間も実装・PR作成・初回convergence可能だが、Bolt 1 gateを追い越さない。
- Bolt 1着地後、Bolt 2のmergeabilityを実測する。mergeableなら現headを維持し、実競合またはbranch protection要求時だけrebase/updateして関連tests/build/convergenceを再実行する。
- coverage / audit shard merge / full suiteはsingle ownerで直列実行する。

## Escalation

- 承認済み interface / Unit ownershipからの逸脱、same-hunk conflict、new state / Stop hook変更の必要は実装せずユーザー裁定へ戻す。
- PR mergeはno-AI-merge。PR URL付きでparent leader sessionへ報告する。
