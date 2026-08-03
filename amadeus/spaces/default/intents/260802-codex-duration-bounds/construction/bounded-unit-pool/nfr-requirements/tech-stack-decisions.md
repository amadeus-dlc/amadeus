# Tech Stack Decisions — bounded-unit-pool

上流入力（consumes 全数）: `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`

## 技術選定

`technology-stack.md` のBun／TypeScript／JSONL audit／fast-checkを維持し、`business-logic-model.md` のC5 pure proposalとC2 single writer、`business-rules.md` のclosed command unionを実装する。

| Decision | Selection | Rationale |
|---|---|---|
| Config key | `max-parallel-units`、階層解決は既存config→space→intent | #1919の要求と既存resolverを再利用 |
| Active cap | default=hard cap=4、overrideは縮小のみ | 現行prose上限と実測最適点を機械強制 |
| Attempts | Unit total default 2／hard 3 | #1998のbounded reserveと整合し長時間化を抑制 |
| Reconciliation | kind別default 2／hard 3、probe 5秒／hard 10秒 | unknown workerを無期限に保持しない |
| Queue | in-memory immutable projection＋canonical JSONL event | daemon／databaseなしでresume可能 |
| Ordering | Kahn法＋UTF-8 unsigned bytewise tie-break | DAG準拠かつ列挙順非依存 |
| Mutation | C2のtyped pool command＋per-intent lock | attempt／slot／settleをatomic commit |
| Driver port | dispatch effect／cancel request／cancel queryのFact | harnessはnative factだけを提供 |
| Testing | Bun test、fast-check、fake worker／latch／clock | 実subagent数やwall sleepに依存しない |
| Distribution | package 7面＋影響self-install 5面を生成 | harness別pool driftをblocking |

## Rejected Alternatives と Gates

- `units.length`をdefault concurrencyにしない。batch全数fan-outとなり上限を強制できない。
- priority queue、dynamic autoscale、driver別cap、LLMによる順序変更を採用しない。
- queued Unit用にworker processを先行spawnしない。
- native handleをcanonical Unit／attempt identityにしない。
- Codex専用schedulerやgateを作らない。

Blocking gateはtypecheck、lint、pool model/property test、cap=2／4 Unit integration、hierarchical config resolution、全harness driver conformance、`bun scripts/package.ts --check`、`bun run promote:self:check`とする。required-sections／upstream-coverage／answer-evidence sensorを適用し、code snippetがないためlinter/type-check sensorは非該当とする。
