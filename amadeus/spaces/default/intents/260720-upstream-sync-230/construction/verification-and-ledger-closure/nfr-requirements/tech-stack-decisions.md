# Tech Stack Decisions — verification-and-ledger-closure

> 根拠: `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`。既存C7 evidence/verification/ledger choke pointを使用し、新技術を追加しない。

## 採用する既存stack

| Concern | Decision | Rationale |
|---|---|---|
| Runtime/Language | Bun 1.3.13 / TypeScript ESM | 既存CI/coverage/ledger toolsと一致。 |
| Evidence | U01〜U11の既存test/docs refs | 第二evidence databaseを作らない。 |
| Public API | 正準3 seam、内部`classifyDisposition` | 公開面・判定variantを拡張しない。 |
| Verification | 既存typecheck/lint/dist/promote/full CI/local lcov | same-SHAの既決gateを再利用。 |
| Ledger | 既存atomic ledger writer | BLOCKED/APPLIEDのidempotent final writeを再利用。 |
| Testing/docs | `bun:test`、integration/e2e runner、既存docs pair gate | FR23/24を既存層で検証。 |

## 追加しない技術

新runtime dependency、service、database、network、UI、distributed ledger、queue、別coverage service、別atomic writer、audit event、retention/SLOを追加しない。

## Source・test ownership

U12は24 item evidence集約、必須verification、ledger closureだけを所有し、機能実装を追加しない。filesystem testはintegration-first、SKIP testは除外し、patch追加行未カバー0と既決waiver証拠条件を守る。

## トレーサビリティ

各decisionは`business-rules.md`のBR-U12-01〜13、`business-logic-model.md`のPurpose/Workflows、`requirements.md`のNFR-3〜8、`technology-stack.md`に対応する。
