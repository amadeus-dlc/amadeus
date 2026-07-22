# Tech Stack Decisions — eligibility-report

## Constraints

`business-logic-model.md` のpure evaluator / renderer / wiring-only root、`business-rules.md` のclosed decision / trace、`requirements.md` のreproducible report、`technology-stack.md` のcurrent stackを維持する。database、dashboard、network publisherを追加しない。

## Selected stack

| Concern | Selection | Rationale |
| --- | --- | --- |
| Runtime / language | Bun 1.3.13 / TypeScript ESM | closed Result / decision unionを既存styleで実装 |
| Evaluation | pure TypeScript functions | hard gate / Paretoをraw I/Oから分離 |
| Serialization | canonical JSON + escaped Markdown | 同一modelから再現可能な2 outputs |
| Identity | `node:crypto` SHA-256 | decision / report / traceをcontent-address |
| Storage | U8 private worker staging + privileged immutable report publisher | rendering権限とclaim / final rename権限を分離 |
| Composition | U1 typed dispatcher + explicit top-level handler registry | wiring-only rootを維持 |
| Tests | `bun:test` | decision table / trace / rendering / wiringを検査 |

## Runtime and schema freeze

evaluation algorithm、report schema、renderer、trace schema、reversal source identity、Bun distributionをrevision manifestへ固定する。workerはnetwork-deny / read allowlist / private-staging-write sandboxを使い、raw inputsはU3/U7 content refsとしてread-onlyに扱う。trusted publisherはrevision manifest、FullMatrixEvidence、algorithm / report / trace schemas、capacity reservationの全identityへclaimをbindし、final storeだけを所有する。

## Rejected additions and checks

weighted score、template engine、HTML dashboard、database、external analytics、dynamic plugin discoveryを追加しない。typecheck / Biome / bun test / package check、72/96 decision fixtures、canonical JSON replay、Markdown escape、trace bijection、wiring equalityを検査する。既知FD findingは別履歴として保持する。
