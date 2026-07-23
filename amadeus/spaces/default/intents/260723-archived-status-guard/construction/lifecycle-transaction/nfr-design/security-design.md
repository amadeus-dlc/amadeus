# Security Design — lifecycle-transaction

`performance-requirements`、`security-requirements`、`scalability-requirements`、`reliability-requirements`、`tech-stack-decisions`、`business-logic-model`のhuman-presence・journal・audit境界を多層防御する。

## Capability boundary

- `LifecycleLockAuthority`だけがworkspace lock callback内でopaque `LockedLifecycleContext`を発行し、return/throw時に失効させる。
- 各locked portはproject、space、active tokenを照合し、別workspace、失効後、lock非保持をdefectとして拒否する。
- archive/unarchiveは未消費HUMAN_TURNを必須とし、同一shard timestamp重複をjournal作成前にfail closedにする。

## Journal validation

- schemaVersion、operationId UUID、verb/from/to、`FFF/TFF/TTF/TTT` topology、予約turn shard/timestamp、userInputをstrict parseする。
- `FTF`等の非prefix topology、未知schema、from/to矛盾、対象消失、現status不一致を自動修復しない。
- 既存audit eventは保存shardと全immutable payloadがjournalに一致する場合だけidempotent successとする。

## Data protection

- userInputは監査shardとjournalにのみ保存し、diagnosticへ全文複製しない。
- fatal diagnosticはworkspace-relative journal path、operationId、intentDir、期待値、観測値を含め、audit全体・secret・absolute home pathを出力しない。
- local same-user raw filesystem actorはOS権限境界の対象とし、repository CLI同士はworkspace lockで直列化する。
