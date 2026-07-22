# Tech Stack Decisions — runtime-recovery

> 根拠: `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`。既存runtime recovery choke pointを使い、新技術を追加しない。

## 採用する既存stack

| Concern | Decision | Rationale |
|---|---|---|
| Runtime/Language | Bun 1.3.13 / TypeScript ESM | 既存orchestrate/state/audit/toolsと同じ境界を維持する。 |
| DAG source | `unit-of-work-dependency.md` + existing pure parser | runtime graphをcacheとして自己修復できる。 |
| Chronology | cross-shard Timestamp collision rejection + Timestamp / shard-local buffer position sort | 証明不能なshard間同値timestampをfail-closedにし、filenameや列挙順へ依存しない。 |
| Atomicity | 既存audit lock内のvalidated batch commit | 5 blockのpartial appendを防ぐ。 |
| Idempotency | 既決transaction identity + complete batch detection | state write failure後にaudit重複0で収束する。 |
| Packaging | manifest-driven 6 harness projection | sourceを正本としdist手編集を防ぐ。 |
| Testing | `bun:test`と既存runner | pure parser、multi-shard、failure injectionをintegration-firstで検証する。 |

公開seamはFunctional Designの`recoverBoltDag`と`recoverGateRevision`に限定し、新identity、fallback、public APIを追加しない。

## 追加しない技術

- runtime dependency、network、database、queue、service、UI、daemon。
- 別transaction log、別cache store、consumer別DAG resolver。
- new audit event、retention policy、service SLO。

## Source・test ownership

既存orchestrate/state/audit lockのchoke pointへ統合し、sourceから6 harnessへgenerator投影する。DAG parserはunit、real artifact/cache/audit shard/atomic commit failureはintegration、全workflowは必要最小e2eで検証する。

push前local lcovでpatch追加行未カバー0を確認し、spawn blind spotは計測済みmoduleへのin-process seamで覆う。waiverは既決条件の明示証拠がある残余行だけに限定する。

## トレーサビリティ

各decisionは`business-rules.md`のBR-U02-01〜24、`business-logic-model.md`の責務境界、`requirements.md`のNFR-3〜8、`technology-stack.md`のruntime・test・distribution構成に対応する。
