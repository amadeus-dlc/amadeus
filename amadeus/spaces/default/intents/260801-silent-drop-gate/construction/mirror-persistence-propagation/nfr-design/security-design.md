# Security Design — mirror-persistence-propagation

## 上流入力

本設計は `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md` を入力とする。保護対象はローカルworkflow state、そのstate block内に埋め込むtransactional outbox、別fileのaudit payload、operation identityであり、外部認証、HTTP、cloud IAM、secret storeは実行面を持たないため非適用である。

## 信頼境界

| 境界 | 未信頼入力 | 検証後の表現 |
|---|---|---|
| filesystem → parser | state／outboxの任意bytes、想定外file type | schema検証済み`OperationSnapshot` |
| outbox → audit | transaction identityとpayload | canonical field完全一致済み`AuditReceipt` |
| atomic adapter → domain | OS error、commit phase | typed `StoreMutationResult` |
| exclusive transaction port | operation intentとpure transition factory | lock、再読、maintenance、commitを内部所有し、lock capabilityを公開しない |
| domain → public caller | 内部maintenance／transition結果 |既存公開unionだけを使う`MirrorOperationOutcome` |
| canonical source → projection | generator入力 | package／promotion drift検証済みprojection |

## 入力・filesystem防御

- canonical state、audit、outboxのliteral repository-relative pathだけをportへ渡し、診断文字列やpayloadからpathを組み立てない。
- 既存atomic adapterのlock、symlink拒否、regular-file検査、temp create、rename、directory fsyncを再利用する。緩いfallback pathは追加しない。
- parse完了前のbytesをbusiness transition、audit照合、public mapperへ渡さない。
- commit前failureではstate／audit／outboxを呼出前bytesのまま保つ。rename後directory fsync failureはbyte不変を偽装せず `durability-unknown` とする。
- business stateと完全なoutboxは同じMirror state documentへrenderし、一回のatomic renameでcommitする。outboxを独立fileへ先行・後行writeする経路を設けない。

## 監査完全性

`AuditOutboxCoordinator` はtransaction identityだけで冪等性を判定しない。既存auditを成功扱いできるのは、次がすべてoutboxと一致する場合だけである。

- payload digest
- full revision
- operation identity
- transition kind
- schema version

一つでも不一致ならembedded outboxを保持したtyped failureとし、auditを上書きせず、current transitionを開始しない。append成功後のclear failureではauditとstate内のstale outboxを残し、次のmaintenance invocationが同じ完全一致検証後にclearする。

## 情報開示制御

- public messageとstderrは固定code、phase、operation identityの必要最小限だけを持つ。
- state全文、outbox payload全文、絶対path、temp path、environment、credentialを出力しない。
- test fixtureの詳細bytesはtest artifactに限定し、production診断へ流用しない。
- transaction identityとdigestは監査相関に用いるが、秘密値として扱う任意source bytesをmessageへ展開しない。

## 脅威別の設計回答

| 脅威 | 設計回答 | 検証 |
|---|---|---|
| malformed state／outbox | schema parserでfail-closed | bytes不変＋typed failure |
| identity collision | canonical field完全一致を必須化 | payload不一致fixture |
| symlink／path escape | 既存atomic adapterのliteral path境界 | filesystem integration |
| retry amplification | 同一invocation retry 0回 | call counter |
| audit repudiation | commit済みstateにauditまたは完全outboxを必須化 | snapshot assertion |
| projection tampering | canonical sourceだけを編集しdrift guard実行 | package／promotion check |

## 非適用と再検討条件

DAST、TLS、CORS、KMS、VPC、IAM、database encryptionは対象面がない。network、credential、remote artifact store、multi-writer serviceを追加する場合はscope changeと新しいsecurity reviewを要求する。
