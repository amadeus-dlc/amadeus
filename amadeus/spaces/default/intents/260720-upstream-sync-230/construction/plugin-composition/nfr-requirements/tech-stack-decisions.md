# Tech Stack Decisions — plugin-composition

> 根拠: `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`。既存C4 composition choke pointとworkspace transactionを使い、新技術を追加しない。

## 採用する既存stack

| Concern | Decision | Rationale |
|---|---|---|
| Runtime/Language | Bun 1.3.13 / TypeScript ESM | 既存core/CLI/testsと一致。 |
| Plugin input | U09 projected bundle + U01 schema | 第二discovery/schema ownerを作らない。 |
| Compile/verify | 既存C1/C2 compiler、sensor、doctor | canonical commit前の既存検証面を再利用。 |
| Public API | 正準6 seam、内部`discoverPlugins` | 公開面とfailure unionを拡張しない。 |
| Atomicity | 既存workspace lock + durable WAL | E-USSU10FD2の三面preimage/recovery境界を実装する。 |
| Persistence | 既存filesystem、record、audit writer | 新database/queue/serviceを導入しない。 |
| Testing | `bun:test`、integration runner、failure injection | ownershipと全crash境界を反証可能にする。 |

## 追加しない技術

新dependency、service、database、network、UI、scheduler、parallel commit、別journal store、別lock、retry engine、marketplace、lockfile、deferred plugin投影、audit event、retention/SLOを追加しない。

## Source・test ownership

inspect/planはunit、temp apply/compile/doctor・journal recoveryはintegration、compose→doctor→dropはU11 E2Eで検証する。U01 schema、U09 projectionを再利用し、U11 reference/guideとU12 ledger closureを所有しない。push前local lcov patch追加行未カバー0と既決spawn/waiver条件を守る。

## トレーサビリティ

各decisionは`business-rules.md`のBR-U10-01〜22、`business-logic-model.md`のPublic seam/Atomic workflows、`requirements.md`のNFR-3〜8、`technology-stack.md`に対応する。
