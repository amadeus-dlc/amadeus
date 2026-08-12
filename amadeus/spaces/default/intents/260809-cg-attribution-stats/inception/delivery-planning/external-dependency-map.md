# External Dependency Map — CG 観測可能区間と帰属不能残余

上流入力（consumes全数）は `requirements.md`、`components.md`、`unit-of-work.md`、`unit-of-work-dependency.md`、`unit-of-work-story-map.md` である。本Intentはrepository内で完結し、B-01をblockする新規外部依存は0件である。

## Gated external items

| External item | Owner | Lead time | Blocking Bolt | Mitigation / workaround | Status |
|---|---|---:|---|---|---|
| 新規外部API | N/A | 0 | none | 利用しない | N/A |
| 外部data availability window | N/A | 0 | none | fixed repository fixtureと既存audit corpusを使う | N/A |
| 外部team hand-off | N/A | 0 | none | team-formation SKIP、single AI mob | N/A |
| application deployment approval | N/A | 0 | none | application deploymentを持たない | N/A |

## Existing internal dependencies

| Dependency | Consumer Unit | Owner | Availability | Failure handling |
|---|---|---|---|---|
| existing journal codec / shard scan | U-02/U-04 | repository core | 現在利用可能 | partial sweep契約を維持し、read failureはexit 1 |
| execution/unit-pool Event Set contract | U-02 | repository core | 現在利用可能 | schema/digest/id failureをclosed rejectionへ分類 |
| existing stage window / idle semantics | U-03/U-04 | repository core | 現在利用可能 | measured branchを変更せずattribution sideで消費 |
| Bun、TypeScript、fast-check、既存test runner | U-01〜U-04 | repository toolchain | lockfileで利用可能 | 新規packageを追加せず既存CI contractを使う |

これらは外部gateではなく、`unit-of-work-dependency.md`と`components.md`に記録済みのexisting integration contractである。

## Human and release boundaries

- B-01のwalking-skeleton gateは人間裁定だが、外部dependencyではなくIntent milestoneである。
- PR mergeはno-AI-mergeの人間境界であり、lead timeを本計画から推定しない。
- version bump、tag、GitHub Release、npm publishはteam `Deployment`の手動`workflow_dispatch`に属し、本IntentのDefinition of DoneやBolt dependencyに含めない。

## Dependency conclusion

外部blocker、secret、credential、new SaaS、network、database、queue、AWS resourceは0件である。外部状態を理由にIssue #2695の要件をdeferする必要はない。
