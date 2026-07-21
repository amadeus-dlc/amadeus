# Business Rules — verification-and-ledger-closure

> 上流入力(consumes全数): `unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md`。

## Trace and verification rules

| ID | Rule | Failure behavior |
|---|---|---|
| BR-U12-01 | public seamは3関数、`classifyDisposition`は内部helperである。 | 公開面追加を拒否 |
| BR-U12-02 | 24 item全てをtest/docs evidenceへtraceする。 | 23/24以下を拒否 |
| BR-U12-03 | EQUIVALENTはupstream contract全体のcharacterization evidence時だけ認める。 | partial evidenceを拒否 |
| BR-U12-04 | SKIP項目のtestを移植せず、採用contractだけを検証する。 | scope逸脱 |
| BR-U12-05 | filesystem testはintegration-firstとし、必須typecheck/lint/dist/promote/full CIの未実施・非0・古い結果をgreenにしない。 | false greenを拒否 |
| BR-U12-12 | patch追加行未カバー0を必須とし、waiverは既決条件の明示証拠時だけ受理する。 | coverage waiver濫用を拒否 |

## Documentation and ledger rules

| ID | Rule | Failure behavior |
|---|---|---|
| BR-U12-06 | docsは英語正本/日本語pair、Amadeus path、6 harness、生成境界を満たす。 | docs gate failure |
| BR-U12-07 | APPLIEDには24 disposition、全必須gate green、最終SHAの三条件を必須とする。 | transition拒否 |
| BR-U12-08 | 単なる未完了/三条件欠落はAPPLIED拒否・ledger bytes不変で、進行中をBLOCKEDにしない。 | premature BLOCKED拒否 |
| BR-U12-09 | 明示的`verification-failure`/`abandon`だけを反証可能根拠付きBLOCKEDへ冪等計画し、baselineを前進させない。 | 曖昧failure分類を拒否 |
| BR-U12-10 | ledger writeは全verification後の最終operationである。 | early transition拒否 |
| BR-U12-11 | U12は機能実装を追加・変更しない。 | ownership越境 |
| BR-U12-13 | 三条件成立だけをAPPLIEDとし、BLOCKED/APPLIEDは既存atomic writerで同一transition再実行をno-opにする。 | duplicate history拒否 |

## Traceability

| Input | 実質利用 |
|---|---|
| `unit-of-work.md` | 3 seam、24 evidence、CI/coverage/SHA、idempotency |
| `unit-of-work-story-map.md` | 全Unit evidence consumer、U12 closure owner |
| `requirements.md` | FR23/24、FR8三条件、EQUIVALENT、docs pair |
| `components.md` | C7 ownerと既存verification/ledger再利用 |
| `component-methods.md` | 正準signatureと判定規則 |
| `services.md` | evidence集約、ledger write最終、DB/networkなし |
