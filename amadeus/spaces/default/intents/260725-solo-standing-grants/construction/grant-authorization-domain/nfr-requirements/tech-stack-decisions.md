# Tech Stack Decisions: grant-authorization-domain

## Inputs

`business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`を確認した。

## Decisions

| Concern | Selection | Rationale |
|---|---|---|
| Runtime | Bun 1.3.x compatible | 既存CLI/hooks/testsと同一 |
| Language | strict TypeScript ESM | directive/result unionとpure queryを型で固定 |
| Persistence | existing Markdown append-only audit | standing grantの現行正本を維持 |
| Locking | existing workspace-level intent registry outer lock + receipt owner intent audit/state inner lock | space-wide receipt cardinalityとowner transactionを閉じ、revoke appendとcommitをowner lockで直列化する |
| IDs | existing 8-hex Grant Id + UUID v4 Route Id | identity/correlation契約を維持 |
| Tests | `bun:test`、既存integration runner、必要箇所のfast-check | deterministic cardinality/order/permutation検証 |
| Formatting | Biome existing config | repository規約 |

## Rejected Additions

database、remote authorization service、cache daemon、new crypto/token library、new runtime dependencyは追加しない。Node標準filesystem/path APIと既存audit parserで実装する。

## Compatibility

team finderのsignature/behaviorを変えず、solo queryとspace-wide receipt ownership lookupを分離する。canonical coreだけを実装ownerとする。teamの発行・取消CLI output、4時間default TTL、audit field/count、leader/delegation approvalは既存goldenをblocking baselineとする。

## Traceability and Verification Ownership

| Decision | Upstream | Business rules | Verification owner |
|---|---|---|---|
| typed pure domain + existing audit | NFR-01, NFR-03, NFR-06 | BR-01–29、Audit Invariants | grant domain unit suite |
| existing workspace/owner lock hierarchy | NFR-01–04 | BR-22–29 | route/commit duplicate contention + commit/revoke contention integration suites |
| existing test stack | NFR-07 | 全BR | related + full test suites |
| canonical generation only | FR-24–26, NFR-08 | harness projection contract | drift checks |
| no new runtime dependency | NFR-05–06 | BR-02, BR-14 | typecheck + dependency diff |
