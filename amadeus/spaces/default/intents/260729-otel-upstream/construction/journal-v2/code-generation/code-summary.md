# Code Summary — U3: journal-v2

上流入力: unit の functional-design / nfr 成果物（全数参照済み）。

## Files created

- schema v2 codec（packages/framework/core/tools/amadeus-journal.ts 拡張）: JournalEntryV2、serializeJournalEntryV2、parseJournalLine（v1/v2 判別）、readJournalRecords
- mergeShards — clone-local sequence 保持・dedup・fork lineage 考慮・no-loss/exactly-once
- convertV1ToV2 — idempotency key 保持、raw/opaque は明示 skip
- renderJournalView — FR-JRN-5 human-readable View
- `tests/integration/t364-journal-v2.pbt.test.ts` — fast-check property suite（mixed/clone/worktree round-trip、no-loss、exactly-once）

## Files modified

- `amadeus-journal.ts`（236→拡張、Journal Module 化。reader-first: writer 変更なし、v1 reader は retention まで保持）

## Key implementation decisions

- v2 record は FR-JRN-1 の全フィールド（schemaVersion・eventId・seq・timestamp・eventName・attributes・intentId/space/cloneId・traceId/spanId/traceFlags・idempotencyKey・canonical）
- merge は決定的全順序（timestamp→key→serialized form）。clone-local sequence は cross-shard の順序キーにしない
- PBT（fast-check）で mixed shard の no-loss/exactly-once を検証

## Test coverage summary

- 150 tests pass（PBT suite 含む）。typecheck・lint・package.ts --check・promote:self:check 全 green

## Deviations from the plan

- なし