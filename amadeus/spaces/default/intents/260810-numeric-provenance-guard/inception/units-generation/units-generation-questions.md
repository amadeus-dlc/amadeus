# Units Generation Questions — 成果物数値の provenance ガード

上流参照: `components.md`、`component-methods.md`、`services.md`、`component-dependency.md`、`decisions.md`、`requirements.md`。正式な `stories.md` は本intentで生成されていない。

## Q1. Unit境界と粒度

単一tool moduleというsource境界をそのまま1 Unitにするか、独立に検証できる成果物の契約境界へ分けるか。

[Answer]: E-UG1 `three-contract-runtime-packaging-units`。mapping根拠をconsumed-in-place contractとして確定するspec、短命runtime executableを作るservice、各harnessへの投影を保証するpackagingの3 Unitに分ける。tool内部のScanner等をUnitへ細分化しない。自動裁定: `auto-decision-9a2f4420d3752a0fcb7ca28c2d6b13fe`。

## Q2. 依存と並列性

依存を無視した同時実装を許すか、DAGの独立nodeだけを並列候補とするか。

[Answer]: E-UG2 `dag-only-independent-parallelism`。direct dependencyだけをDAGへ記録し、依存関係のないUnitだけを並列候補とする。本分解はcontract→service→packagingのデータ依存を持つため、独立Unit集合はない。経済的なBolt順序はここで決めない。自動裁定: `auto-decision-efc1f639e7ec40fa203bc128f9052ff2`。

## Q3. 統合契約と配布モデル

Unit間をnetwork APIで接続するか、同一repo・同一build内の生成成果物とsource contractで接続するか。

[Answer]: E-UG3 `embedded-cli-single-distribution`。spec Unitのsweep/mapping契約をservice UnitがTypeScript定数として消費し、packaging Unitが既存buildへ埋め込む。REST、gRPC、event、DB、独立deploymentは追加しない。自動裁定: `auto-decision-c3fb8d93e4fa6c3745afcd4d3fe05122`。

## 対話方式

[Answer]: E-UG0 `guide`。境界、依存、配布を順に裁定した。自動裁定: `auto-decision-57aa7186d7831fa3fb22f90eef50d804`。

## 分解計画の承認

[Plan Approval]: E-UGP `approve-plan`。3 Unit、direct edge 2本、各Unitのcanonical kindを固定した。自動裁定: `auto-decision-4472a0d0c8c9b3f7ffaf71f88459d65c`。

## 曖昧性分析

- `service` は長時間稼働serviceではなく、配布され実行される短命Bun CLIというcanonical kindの意味で使う。
- `spec` は再現可能なsweep結果とmapping schemaをその場で消費するcontractであり、独立runtimeを持たない。
- `packaging` は新しいdeployableを作らず、既存buildによる全harness投影とdelivery-tree受け入れを所有する。
- Unit間のtopologyと、Delivery Planningが決める経済的なBolt sequenceを混同しない。
