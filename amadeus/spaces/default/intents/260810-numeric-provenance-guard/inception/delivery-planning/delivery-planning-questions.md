# Delivery Planning Questions — 成果物数値の provenance ガード

上流参照: `requirements.md`、`components.md`、`unit-of-work.md`、`unit-of-work-dependency.md`、`unit-of-work-story-map.md`。正式なstories、mockups、team-formation成果物は本intentで生成されていない。

## Q1. Sequencing heuristicとWSJF

新しい検証経路を持つself-featureとしてwalking skeletonを置くか、value-firstまたはWSJF比較を使うか。

[Answer]: E-DP1 `walking-skeleton-risk-first`。mapping contract、runtime CLI、delivery-treeを端から端まで通すwalking-skeletonを最初のBoltとし、corpus実測でenforcement mappingが成立しない最大リスクを早期の停止条件にする。候補Boltが単一なのでWSJFの相対scoreは使わない。自動裁定: `auto-decision-b9407aa13d216d693fdc81f0cf9db63a`。

## Q2. Bolt粒度と並列性

3 Unitを別々のBoltへ分けるか、関連Unitをwalking-skeleton Boltへ束ねるか。複数Boltを並列化するか。

[Answer]: E-DP2 `single-bundled-bolt-sequential`。`numeric-provenance-mapping-contract`、`numeric-provenance-sensor-cli`、`numeric-provenance-distribution` を1つのBoltへ束ね、Bolt内部でUnit DAGを守る。並列Boltはない。自動裁定: `auto-decision-11b430cb1e36fb7237d6ae0c799c59f1`。

## Q3. 外部依存と先行リスク

外部API、外部data window、他team hand-offに依存するか。どのriskを最初にfail-closedで判定するか。

[Answer]: E-DP3 `local-only-with-human-gates`。実装入力はrepository corpus、runtime graph、Bun toolchainだけで、外部API/data/team hand-offはない。corpus分類が要件閾値を満たさずenforcement groupを作れない場合を最初の停止条件とする。walking-skeleton確認とPR mergeは人間承認境界として残す。自動裁定: `auto-decision-d00d3cdb324e8aaf07048f642e2ea2d7`。

## 対話方式

[Answer]: E-DP0 `guide`。heuristic、granularity、dependency/riskの順に裁定した。自動裁定: `auto-decision-24bdecd3c09e7087fcece109bb3166eb`。

## Bolt回答

[Bolt Answer]: E-DPB1 Bolt slugは `numeric-provenance-walking-skeleton`。全3 Unitをbundleし、walking skeletonとする。Definition of Doneはmapping再現、pure evaluatorのTDD、CLI/manifest/stage配線、性能予算、全harness投影、delivery-tree audit、CI blocking集合のgreen。confidence hypothesisは「固定predicateから低偽陽性のenforcement mappingを導出し、配送先の短命CLIがprovenance欠落だけをadvisory findingとして報告できる」。所有mobはAI-onlyのdeveloper-led mob。

## 曖昧性分析

- 単一BoltへのbundleはUnit境界を消さない。Bolt内部のacceptance checkpointがU1/U2/U3の所有証拠を分ける。
- walking skeletonは一部の仮実装ではなく、mapping→runtime→delivery-treeの最小な全経路である。本scopeは狭いため同じBoltがinitiativeの全機能を完了する。
- Bolt間の経済順序は候補が単一なので存在しない。Unit内部のDAG順とrisk checkpointだけを記録する。
- GitHub CIとhuman approvalは外部coordination gateだが、runtime product dependencyではない。
