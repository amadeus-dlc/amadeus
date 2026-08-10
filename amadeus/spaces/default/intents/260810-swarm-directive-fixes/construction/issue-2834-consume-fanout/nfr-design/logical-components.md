# Logical Components — issue-2834-consume-fanout

入力: [`business-logic-model.md`](../functional-design/business-logic-model.md)。NFR Requirementsはself-feature scopeでexpected skipのため、宣言済みperformance / security / scalability / reliability identifierは存在しない。

## Component Inventory

| Component | Responsibility | Side effects | Failure boundary |
|---|---|---|---|
| StageGraphMetadataReader（既存） | producer/consumer/artifact/for_each宣言を読む | read only | parse / inventory driftはerror |
| EffectivePopulationResolver（新規pure seam） | declared Unitと公開outcomeをsucceeded/cancelled/blockingへ分類 | none | ambiguous/blocking/zeroはfail-closed |
| PerUnitConsumeFanout（新規pure seam） | Unit×artifact展開、限定placeholder解決、stable dedupe | none | unresolved `{unit-name}`は全結果破棄 |
| PresenceClassifier（既存adapter拡張） | concrete pathをpresent/required absentへ分類 | record-root read only | read失敗は全directive中止 |
| OrchestratorConsumeAdapter（既存拡張） | graph/population/fan-out/presenceを既存directiveへ写像 | existing cursor read only on success | error時cursor不変 |
| ReviewerScopeGuard（既存拡張） | required gap拒否、present input全件scope化 | validation only | review開始前に停止 |

`business-logic-model.md:5-15`はpopulation resolver、`:17-29`はfan-out/presence、`:31-46`はmetadata inventory、`:48-52`はreviewer guardへ対応する。

## Dependency Direction

```text
StageGraphMetadataReader -----> EffectivePopulationResolver
             |                              |
             +----> PerUnitConsumeFanout <--+
                              |
                       PresenceClassifier
                              |
                    OrchestratorConsumeAdapter ---> run-stage directive
                              |
                      ReviewerScopeGuard
```

pure componentsはfilesystem、orchestrator、reviewer runtimeへ逆依存しない。OutcomeProjectionはorchestrator adapterから公開入力として受け取り、U1 moduleをimport・変更・直接実行しない。U1のfailure selector/halt/park regionとStop hookは本Unitのblast radius外である。

## Failure Domains and Blast Radius

- population failure: consumer directiveを発行せずcurrent cursorをerrorで保持する。
- one artifact missing:全fan-out自体は保持し、そのconcrete pathだけを`expected:false` absentへ分類してreview開始を拒否する。
- presence read failure: snapshot混在を避けるため全classificationを破棄する。
- inventory drift: expected / actual consumer・edgeをtyped errorへ載せ、19 edgeの一部だけを発行しない。
- cancelled Unit: 正常な母集団除外でありabsenceやfailureへ変換しない。
- crash / retry: persistent cacheを持たず、同じgraph/outcome/disk snapshotからstable orderで再構成する。

## Resource and Deployment Model

短命なBun CLI process内で同期実行するshared / embedded libraryであり、daemon、database、queue、network service、AWS resourceを追加しない。fan-outのmemory規模はeffective Unit数×required artifact数で、7 consumer / 19 edge inventoryの各directive生成時に限定される。performance/scalabilityの独立成果物はlibrary kindに非適用で、engine directiveにもproduceされていない。

## Verification Boundaries

population / fan-out / placeholder invariantをpure unit test、7 consumer / 19 edgeとpresence splitをorchestrator integration、required gapをreviewer runtime testで検証する。既存placeholderとslug-based upstream sensorは変更せず回帰suiteだけを実行する。
