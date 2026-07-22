# Domain Entities — leader-sync-tool(U1)

上流入力(consumes 全数): requirements, components, component-methods, services, unit-of-work, unit-of-work-story-map — 型は components.md C1〜C6 と component-methods.md M1〜M8 の写像、決定性は requirements.md FR-3、port 面は services.md の2 runner、U1 完結性は unit-of-work.md、ジャーニー消費は unit-of-work-story-map.md に依拠

## エンティティ(functional-domain-modeling-ts — type+コンパニオン、判別ユニオン Result)

| 型 | 形 | 不変条件 |
| --- | --- | --- |
| `OwnedSet` | `{ electionPaths: string[]; shardPaths: string[] }` | 全 path は repo 相対・決定的列挙順(sort 済み)。2クラス限定(ADR-3)— 他クラスを表現不能に(parse-don't-validate) |
| `ShardName` | ブランド型 `string`(`<host48>-<cloneId>.md` 合成のみが生成経路) | `shardBasename` スマートコンストラクタ経由のみ。cloneId は `^[a-z0-9]{1,32}$`(readCloneIdNoFollow 実測形 — 12hex はミント既定に過ぎない点を AD レビューから継承) |
| `ExclusionViolation` | 判別ユニオン `{kind:"foreign-modify"\|"memory-touch"\|"snapshot-carry"; path: string}` | E-PM10A の3違反クラスを型で列挙(網羅は switch 完全性で担保) |
| `SelfCheckReport` | `{ pureAddition: boolean; parseFailures: string[]; markerHits: {path,count}[] }` | 実行結果からのみ構築(検証劇場 Forbidden — 全フィールドが PR 本文へ機械転記され消費される) |
| `SyncStatus` | `{ unsyncedElections: number; shardDeltaLines: number; normDeltaLines: number; thresholdExceeded: boolean }` | thresholdExceeded は `unsyncedElections > SYNC_ELECTION_THRESHOLD` の導出値(独立設定不能) |
| `SyncError` | 判別ユニオン `{kind:"clone-id-missing"\|"git-failed"\|"gh-failed"\|"usage"; detail: string}` | fault/usage の error-classification(M8 の exit 写像 1/1/1/2) |

## 生成規律

- 全型は frozen リテラル+スマートコンストラクタで生成(貧血型・全面 static 寄せの双方を回避 — functional-design:c11)。
- `ShardName` の合成規則は BR-8 のドリフト検知テストで packages 側 `auditShardName` と同期固定される(ADR-2 の継承)。
