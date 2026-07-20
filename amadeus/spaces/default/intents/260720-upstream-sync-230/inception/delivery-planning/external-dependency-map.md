# External Dependency Map — upstream-sync-230

> 上流入力(consumes 全数): `requirements.md`、`components.md`、`unit-of-work.md`、`unit-of-work-dependency.md`、`unit-of-work-story-map.md`、`team-practices.md`。`stories.md` / `mockups.md` は本 scope で SKIP 済み。

## External dependencies

外部API、data availability window、external-team handoff、regulatory approval、cloud resource、release/publish windowは **0件**。全Boltはrepo-local Bun/TypeScript、Git、既存GitHub PR、既存CIで完結する。upstream v2.3.0 sourceは固定済みcomparison evidenceとして読むだけで、実行時network dependencyにしない。

| External item | Owner | Lead time | Blocking Bolt | Mitigation |
|---|---|---:|---|---|
| なし | N/A | 0 | なし | N/A |

## Internal gates（external dependencyではない）

| Gate | Blocks | Owner | Exit condition |
|---|---|---|---|
| Bolt 1–5 progressive skeleton | Bolt 6以降 | leader + stage reviewers | U01/U09/U10/U11独立evidence + U11 e2e closure |
| Per-Bolt PR approval | 各依存Bolt | human reviewer / leader merge | targeted tests/coverage/review green、squash merge |
| U12 closure | ledger `APPLIED` | quality + leader | 24/24 evidence、full CI、最終SHA |
| Inception Phase PR | Construction着手 | human reviewer / leader | 本Phase record/codekb/intents unionのreview/mergeと明示的後続判断 |

## Scope exclusions

- marketplace/lockfile/managed settings、plugin dynamic fetch、telemetryは導入しない。
- release/version/tag/npm publishとapplication deploymentは行わない。
- 新規runtime dependency、JVM/cloud service、credential/secret面は追加しない。
