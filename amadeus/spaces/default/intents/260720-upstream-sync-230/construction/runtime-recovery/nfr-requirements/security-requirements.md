# Security Requirements — runtime-recovery

> 根拠: `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`。dependency artifact、runtime cache、audit shards、stateをuntrusted persisted inputとして検証する。

## Integrity controls

| ID | 脅威 | control | 合格条件 |
|---|---|---|---|
| SEC-U02-01 | malformed DAGをzero-unit扱い | artifact実在時のread/parse/edge/cycle失敗をmalformed loud errorにする。 | single-iteration degradeはartifact absentだけ。 |
| SEC-U02-02 | stale cacheによるUnit欠落 | canonical artifactを正本として欠落/余剰/順序差をhealする。 | 全consumerがcanonical Unit集合を使用。 |
| SEC-U02-03 | revision evidence spoofing | organic anchor、human pivot、declared produces write、reject absenceのclosed predicateだけを使う。 | memory/questions/他Unit/non-producesは証拠0。 |
| SEC-U02-04 | human不在backfill | autonomous Constructionとoff-switch時はbackstopをskipする。 | recovered block追加0。 |
| SEC-U02-05 | partial audit/state | 5 block全数検証後のatomic commitと最終state 1回writeを使う。 | failure時audit/state bytes不変。 |

Recovered gate-openをanchorへ使わず、既存rejectがあれば二重backfillしない。transaction identityは既決形式だけを使い、新しいidentity policyを追加しない。

## Data・supply chain

- audit/stateの既存lock、path ownership、required fieldを維持し、new credential/network/data storeを追加しない。
- upstream sourceは検査根拠として扱い実行しない。dist手編集をせずgeneratorで同期する。
- new audit event type、retention、permission、public APIを追加しない。
- codekb特殊layoutを未承認のrevision recovery対象へ広げない。

## Failure・compliance

生成/検証/commit failureはaudit/state双方を呼出前bytesへ保つ。commit後state failureだけは完全batchのtransaction identityを検出し、次回audit追加0で同一最終stateへ収束する。不完全batchを成功扱いしない。

追加規制要件はない。既存human presence、audit provenance、license境界を維持する。

## トレーサビリティ

SEC-U02-01〜05は`business-rules.md`のBR-U02-01〜24、`business-logic-model.md`のEvidence/Approve transaction、`requirements.md`のNFR-2、NFR-3、NFR-8、`technology-stack.md`のdependency境界に対応する。
