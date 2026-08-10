# Functional Design Questions — numeric-provenance-mapping-contract

上流参照: `unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md`。本Unitはcanonical kind `spec` で、frontend/UIを含まない。

## Q1. Authorityとprojection

sweep成果物とGenerated Mappingのどちらを編集可能な正本とするか。

[Answer]: E-FDU1-1 `sweep-authority-generated-projection`。機械生成sweep成果物を根拠の唯一のauthorityとし、TypeScript mappingは同内容のruntime projectionとする。両者の手編集を許さず、drift testでbyte/集合一致を強制する。自動裁定: `auto-decision-f283996c19af89a031e32fa61840cbce`。

## Q2. Classification workflow

modeと近傍窓 `W` を手動curation、runtime adaptive、決定的pipelineのどれで確定するか。

[Answer]: E-FDU1-2 `deterministic-threshold-pipeline`。固定predicate→決定的sample→二値label→距離統計→要件threshold→mode/`W`→stage配線集合の順で一意に導出する。runtimeで再分類しない。自動裁定: `auto-decision-5ceb8f97dc32f95280deb26dca87a25a`。

## Q3. Domain lifecycleとerror境界

evidenceをmutable workbookやdatabase workflowで管理するか、immutable snapshotの状態遷移として管理するか。

[Answer]: E-FDU1-3 `immutable-evidence-state-machine`。同一HEADのCorpusSnapshotからSweepReport、LabeledSample、ClassificationEvidence、ApprovedMappingへ進むimmutable lifecycleとする。入力欠落・identity衝突・閾値不成立・driftは型付きfailureとして停止し、暗黙補完しない。自動裁定: `auto-decision-a116b1a19cbf5de468b36c9a74f1cb9a`。

## 対話方式

[Answer]: E-FDU1-0 `guide`。authority、classification、lifecycleの順に裁定した。自動裁定: `auto-decision-cee3d097be3ed51c540c30544fdabb74`。

## 曖昧性分析

- `spec` は散文だけではなく、再計算可能なsweep artifact、mapping schema、fixture identityをconsumed-in-placeで提供するUnit kindである。
- U1はfixed predicateのcontractとdesign-time測定を所有する。runtime verdictとCLI error表現はU2、build projectionはU3が所有する。
- quality leadの承認はthresholdを変更する裁量ではなく、同一入力からの再計算一致を確認する行為である。
- UI、network、database、concurrency writerは存在しない。並行scanを実装するかは性能実測後の実装判断であり、contractの意味論に含めない。
