# Services — codekb diff3 cleanup(Issue #1129)

上流入力(consumes全数): `requirements.md`、`architecture.md`、`component-inventory.md`、`team-practices.md`。

## Service Definitions

新規serviceは0件。`requirements.md` はservice / API / event / AWS infrastructureの追加を必要とせず、`architecture.md` と `component-inventory.md` の既存topologyを変えない。従ってorchestration / choreography、remote communication、service-owned storage、scaling policy、availability targetを新設しない。

## Operational Flow (not a service)

| Flow | Owner | Input | Output | Stop condition |
|---|---|---|---|---|
| Pre-landing verification | conductor | branchの明示ref | marker / H2 / ancestry / lifecycle証拠 | 件数不一致、sensor / review / gate不足 |
| Landing handoff | human / leader | CI greenを含むgate-ready push SHAと独立review | landing pendingまたはlanded ref | 明示承認なし、CI verdict missing / non-green |
| Post-landing verification | human-owned follow-up | landed mainの明示ref | 再計測証拠とclose eligibility | marker / H2不一致、ref不明 |
| Issue close | leader / human | post-landing green証拠 | Issue #1129 closed | main未着地または再検証未完了 |

これらは`team-practices.md` の人間承認境界を表す手順であり、deployされるserviceではない。

## Communication Contracts

- 同期通信、非同期event、REST、gRPC、queueは追加しない。
- 境界間の受け渡しは、commit SHA、検証件数、CI verdict、audit、sensor verdict、review verdict、gate provenanceを持つversion-controlled recordのみとする。
- `5e92d1516ba44856f1ec039e7b1eadebbfb4c8c0` の祖先性はcontent cleanと別契約で伝え、non-ancestorを理由にblind reapplyしない。

## Lifecycle and Scaling

runtime workload、traffic、persistent processが増えないため、instance lifecycle、auto scaling、multi-AZ、cost estimate、AWS Well-Architected reviewは非該当。運用フローの完了条件は次段への証拠実在であり、時間ベースの自動retryではない。
