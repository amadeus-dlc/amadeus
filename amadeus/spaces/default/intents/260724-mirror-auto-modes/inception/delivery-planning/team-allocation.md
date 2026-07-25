# Team Allocation

> 上流入力（consumes 全数）: `requirements.md`、`components.md`、`unit-of-work.md`、`unit-of-work-dependency.md`、`unit-of-work-story-map.md`、`team-practices.md`

## Allocation Basis

Team Formationは本scopeでSKIPされているため、人間の固定teamを仮定しない。`team-practices.md`の短命branch／PR規律と、`components.md`・`unit-of-work.md`のowner境界に従い、Construction stageの各専門agentをAI mobとして割り当てる。`unit-of-work-dependency.md`の並行可能性と`unit-of-work-story-map.md`のacceptance sliceを作業境界にし、`requirements.md`の安全guardを全mobの共通Definition of Doneとする。

## Bolt-to-Mob Assignment

| Bolt | Mob | Primary owner | Supporting roles | Branch intent |
|---|---|---|---|---|
| Bolt 1 Runtime Walking Skeleton | AI Runtime Mob | `amadeus-developer-agent` | architect、quality、devsecops | `codex/mirror-runtime-walking-skeleton` |
| Bolt 2 Distribution and Documentation | AI Distribution Mob | `amadeus-developer-agent` | quality、delivery | `codex/mirror-distribution-docs` |

branch名はDelivery Plan上の意図を示す候補であり、実際のworktree／branchはConstruction refereeが割り当てる。両Boltとも`main`をtargetに短命PRとして統合し、version bump、tag、npm publishは行わない。

## Bolt 1 Role Boundaries

| Role | Ownership |
|---|---|
| Developer | C0〜C8 runtime実装、tests、fake runner、failure injection |
| Architect | Unit contract、DAG、provenance／state／Gateway境界の整合確認 |
| Quality | AS-01〜06／08、duplicate=0、external mutation guard、coverage ratchet |
| DevSecOps | credential redaction、argument array、repository binding、safe close guard |

`mirror-state-provenance`と`mirror-github-gateway`は同じC0 contractを使って並行作業できる。`mirror-operation-lifecycle`への統合は両Unitの公開contractがgreenになった後に行い、private helperを共有しない。

## Bolt 2 Role Boundaries

| Role | Ownership |
|---|---|
| Developer | core／manifest／package／promote、skill、日英文書の変更 |
| Quality | 6 layout、docs parity、dist／self-install drift、root resolution |
| Delivery | 正本→生成物の変更集合とreview pathの明確化 |

Bolt 2はBolt 1の完成runtime contractを変更せず投影する。runtime契約変更が必要になった場合はBolt 1 ownerへ差し戻し、distribution overlayで挙動差を隠さない。

## Program Board

| Work item | Bolt 1 | Bolt 2 |
|---|---|---|
| Runtime contract | Own／complete | Consume |
| State／provenance | Own／complete | Reference in docs |
| GitHub Gateway | Own／complete | Package |
| Lifecycle／presentation | Own／complete | Document／project |
| 6-harness distribution | Not owned | Own／complete |

Bolt間は逐次であり、同じgenerated fileを複数mobが同時編集しない。PR reviewではUnit owner、test evidence、生成driftの3点を対応付ける。
