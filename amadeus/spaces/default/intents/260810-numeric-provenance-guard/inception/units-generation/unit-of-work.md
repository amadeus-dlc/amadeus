# Unit of Work — 成果物数値の provenance ガード

上流参照: `components.md` の論理責務、`component-methods.md` のpure evaluator境界、`services.md` の短命CLI、`component-dependency.md` のdesign-time/runtime flow、`decisions.md` のADR-1〜3、`requirements.md` のFR/NFR契約。正式なuser stories成果物はないため、要件由来のdelivery scenarioを `unit-of-work-story-map.md` で対応付ける。

## 分解原則

source内部のScanner、Resolver、Classifier等は常に同じtool moduleで変更されるため別Unitにしない。一方、実測mapping contract、runtime executable、build/distributionは、異なる受け入れ証拠とcanonical kindを持つため3 Unitへ分ける。

Unitは経済的な実装順序を表さない。direct dependencyと選択可能なtopological orderは `unit-of-work-dependency.md` にだけ記録し、Bolt sequenceはDelivery Planningへ委ねる。

## U1: `numeric-provenance-mapping-contract`

- **Canonical kind:** `spec`
- **目的:** 固定4 claim class、provenance語彙、除外、成果物種別別mode、近傍窓 `W`、配線stage集合のschemaと受け入れ条件を、実行コードに依存しないconsumed-in-place contractとして確定する。
- **所有する成果物:** UTF-8 `JSON.stringify([relativePath,line,normalizedText])`（空白なし・要素順固定）のlowercase hex SHA-256 sample identityと二値labelのschema・承認fixture、距離統計と偽陽性率のschema、Design-time Artifact Indexの入出力契約、`stage + record相対output pattern -> produces key` を含むmapping schema、W/mode/stage集合の受け入れ条件、生成結果との一致contract。
- **境界:** 実行可能なindex/sweep generator、機械生成sweep report、生成TypeScript定数、sensor manifest、CLI flag処理、runtime verdict出力、harness投影を所有しない。固定predicateの変更はrequirements変更なしに行わない。
- **統合面:** U2がschema、承認済みfixture、受け入れ条件をconsumed-in-placeで読み、単一tool moduleのindex/sweep generatorとruntimeへ実装する。runtime network/APIはない。
- **Deployment model:** `embedded`。独立processを持たず、U2のsource定数とテストfixtureへ埋め込まれる。
- **Complexity:** `L`。既存corpus全走査、決定的標本、最低label数、距離分布、runtime graph produces対応の再現性を同時に満たすため。
- **制約:** FR-SWP-1〜4をU2が機械適用できるよう、`W = max(nearest-rank p95, min + 1)`、`W < max`、lower/upper-bound saturationの期待値をfixtureへ固定する。U1自身はgeneratorを実行せず、実測結果を所有しない。
- **完了証拠:** schema検証、全承認fixtureのlabel/reason、lower/upper-bound saturationとmodeの期待値を、U2実装なしで検証できる。

## U2: `numeric-provenance-sensor-cli`

- **Canonical kind:** `service`
- **目的:** 既存dispatcherから同期起動され、1成果物をpure evaluatorで検査し、advisory verdictを返す短命Bun executableを提供する。
- **所有する成果物:** `amadeus-sensor-numeric-provenance.ts`、Design-time Artifact Index、corpus sweep generatorと機械生成report、readonly TypeScript mapping、`amadeus-numeric-provenance.md` manifest、enforcement stage frontmatter配線、pure evaluatorと注入I/O、cutoff、claim scanner、provenance resolver、artifact classifier、CLI adapter、runtime/integration fixtures。
- **境界:** U1のschema・fixture・受け入れ条件を変更せず実装し、既存dispatcher・graph compiler・auditを変更しない。DB、network、AWS、UIを追加しない。
- **統合面:** design-timeは注入runtime graph snapshot→Mapping非依存index→sweep report→readonly mapping、runtimeは `--stage` / `--output-path`→sensor verdict JSON。生成済みmappingからproduces keyとmodeを解決し、既存dispatcherがaudit記録する。
- **Deployment model:** `embedded`。frameworkのtools/sensors treeに含まれる短命executableで、独立service deploymentはない。
- **Complexity:** `L`。Markdown構造境界、許可root付きlink解決、fail-open、4 claim class、measurement/enforcement/cutoffの境界を同一moduleで実装・試験するため。
- **制約:** Bun-only、新規runtime dependencyなし、単一tool module、`requireFlagValue`、通常verdictはexit code 0、100KB性能予算を守る。sweepはruntime Evaluator / Classifierや生成前Mappingを呼ばず、`W = max(nearest-rank p95, min + 1)` かつ `W < max` を満たす組だけをenforcementにする。lower-bound saturationはstrict interiorへ補正し、upper-bound saturationはmeasurement-onlyとする。少なくとも1組のenforcementが得られない場合はUnit完了にしない。
- **完了証拠:** Red/Green seam、正負fixture、cutoff両方向、glob両engine、同一HEADのsweep再計算、全sample label、mode/`W`/stage集合、生成mapping一致、性能測定、advisory audit emissionを検証できる。

## U3: `numeric-provenance-distribution`

- **Canonical kind:** `packaging`
- **目的:** U2のtool・manifest・stage配線を既存buildで全配送面へ決定的に投影し、配送先treeで受け入れを証明する。
- **所有する成果物:** `bun run build` 投影検証、core/self-install/distのdrift検査、配送先からのsensor fire実証、source-only/reproducibility/CI gateの証拠。
- **境界:** core正本のruntime意味論を再実装せず、生成された `dist/` やself-install surfaceを手編集・commitしない。
- **統合面:** U2のcore sourceと既存harness manifestのdirectory projection。外部registryやnetwork APIはない。
- **Deployment model:** `shared`。既存Amadeus build/distributionへ同梱される。
- **Complexity:** `M`。機能ロジックは持たないが、全harness・source-only・決定的build・delivery-tree acceptanceの複数面を検証するため。
- **制約:** `packages/framework/core/` を正本とし、`dist/` とself-install生成面をGit境界へ持ち込まない。
- **完了証拠:** build後の配送先fireがSENSOR_PASSED/FAILEDをauditへemitし、CIブロッキング集合がgreenである。

## Unit coverage

| Requirement group | Primary Unit | Supporting Unit |
| --- | --- | --- |
| FR-SWP、mappingの正本、距離閾値 | U2 | U1（schema/承認fixture/受け入れ条件） |
| FR-PRED、FR-CUT、FR-SEN、NFR-1〜4 | U2 | U1（schema/fixture） |
| FR-TST | U2 | U1（標本）、U3（配送面/CI） |
| FR-DIST | U3 | U2（投影元） |

全要件groupは少なくとも1 Unitがprimary ownerを持つ。所有は、U1の実行コード非依存contractをU2が実装し、U2だけが生成結果とruntime sourceを所有し、U3がそのsourceを投影する一方向に限定する。


## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-10T11:49:49Z
- **Iteration:** 1
- **Scope decision:** none

canonical kind、DAG、要件trace、W導出式そのものは整合しているが、Design-time Artifact Index／Corpus Sweepの実装所有権がU1とU2にまたがり、記載DAGにない逆依存と循環するConstruction契約を生んでいる。

### Findings

- BLOCKER | U1はcanonical kind `spec`（consumed-in-placeのcontract/schema）でありながら、Design-time Artifact Index、機械生成Corpus Sweep、mapping生成を所有する。一方、`component-methods.md`はそれらを実装する`indexSweepArtifacts`／`sweepNumericProvenance`を定義し、ADR-1はSweepを含む全実装を単一の`amadeus-sensor-numeric-provenance.ts`へ置き、`unit-of-work.md`ではそのtool moduleをU2が所有する。したがってU1の完了にはU2所有コードの実装が必要だが、YAML DAGは逆向きにU2 depends on U1とだけ定義しており、実際のConstructionにはU1→U2→U1の循環と同一ファイルの二重所有が生じる。実行可能なindex/sweepをU1の`spec`境界から外して循環しない生成契約を定義するか、Unitの統合・物理分割とcanonical kind、所有ファイル、DAGを一貫して改訂する必要がある。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-10T11:51:51Z
- **Iteration:** 2
- **Scope decision:** none

前回BLOCKERは解消された。U1は実行コード非所有の`spec` contractへ限定され、Design-time Artifact Index、sweep generator/report、generated mapping、runtime sourceはU2へ一元化されている。U1→U2→U3の所有権とDAGは非循環で、canonical kind、要件trace、Mapping非依存index、打切りなし距離計測、W導出・saturation分類の契約も整合している。

### Findings

- None
