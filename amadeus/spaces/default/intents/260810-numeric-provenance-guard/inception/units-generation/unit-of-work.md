# Unit of Work — 成果物数値の provenance ガード

上流参照: `components.md` の論理責務、`component-methods.md` のpure evaluator境界、`services.md` の短命CLI、`component-dependency.md` のdesign-time/runtime flow、`decisions.md` のADR-1〜3、`requirements.md` のFR/NFR契約。正式なuser stories成果物はないため、要件由来のdelivery scenarioを `unit-of-work-story-map.md` で対応付ける。

## 分解原則

source内部のScanner、Resolver、Classifier等は常に同じtool moduleで変更されるため別Unitにしない。一方、実測mapping contract、runtime executable、build/distributionは、異なる受け入れ証拠とcanonical kindを持つため3 Unitへ分ける。

Unitは経済的な実装順序を表さない。direct dependencyと選択可能なtopological orderは `unit-of-work-dependency.md` にだけ記録し、Bolt sequenceはDelivery Planningへ委ねる。

## U1: `numeric-provenance-mapping-contract`

- **Canonical kind:** `spec`
- **目的:** 固定4 claim class、provenance語彙、除外、成果物種別別mode、近傍窓 `W`、配線stage集合を、同一HEADで再計算可能なcontractとして確定する。
- **所有する成果物:** Construction配下の機械生成corpus sweep、sample identity、二値labelと理由、距離統計、偽陽性率、`stage + record相対output pattern -> produces key` を含むmapping schema、生成TypeScript定数との一致contract。
- **境界:** sensor manifest、CLI flag処理、runtime verdict出力、harness投影を所有しない。固定predicateの変更はrequirements変更なしに行わない。
- **統合面:** U2がreadonly mappingと承認済みfixtureをconsumed-in-placeで読む。runtime network/APIはない。
- **Deployment model:** `embedded`。独立processを持たず、U2のsource定数とテストfixtureへ埋め込まれる。
- **Complexity:** `L`。既存corpus全走査、決定的標本、最低label数、距離分布、runtime graph produces対応の再現性を同時に満たすため。
- **制約:** FR-SWP-1〜4の閾値規則を機械適用し、少なくとも1組のenforcementが得られない場合はUnit完了にしない。sweep成果物が根拠の正本で、生成定数は投影である。
- **完了証拠:** 同一HEADでの再計算一致、全sample label、mode/`W`/stage集合、生成mappingのbyte/集合一致を検証できる。

## U2: `numeric-provenance-sensor-cli`

- **Canonical kind:** `service`
- **目的:** 既存dispatcherから同期起動され、1成果物をpure evaluatorで検査し、advisory verdictを返す短命Bun executableを提供する。
- **所有する成果物:** `amadeus-sensor-numeric-provenance.ts`、`amadeus-numeric-provenance.md` manifest、enforcement stage frontmatter配線、pure evaluatorと注入I/O、cutoff、claim scanner、provenance resolver、artifact classifier、CLI adapter、runtime/integration fixtures。
- **境界:** U1のmappingを再計算せず、既存dispatcher・graph compiler・auditを変更しない。DB、network、AWS、UIを追加しない。
- **統合面:** `--stage` / `--output-path` とsensor verdict JSON。U1のmappingからproduces keyとmodeを解決し、既存dispatcherがaudit記録する。
- **Deployment model:** `embedded`。frameworkのtools/sensors treeに含まれる短命executableで、独立service deploymentはない。
- **Complexity:** `L`。Markdown構造境界、許可root付きlink解決、fail-open、4 claim class、measurement/enforcement/cutoffの境界を同一moduleで実装・試験するため。
- **制約:** Bun-only、新規runtime dependencyなし、単一tool module、`requireFlagValue`、通常verdictはexit code 0、100KB性能予算を守る。
- **完了証拠:** Red/Green seam、正負fixture、cutoff両方向、glob両engine、mapping一致、性能測定、advisory audit emissionを検証できる。

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
| FR-SWP、mappingの正本、距離閾値 | U1 | U2（runtime投影の消費） |
| FR-PRED、FR-CUT、FR-SEN、NFR-1〜4 | U2 | U1（mapping/fixture） |
| FR-TST | U2 | U1（標本）、U3（配送面/CI） |
| FR-DIST | U3 | U2（投影元） |

全要件groupは少なくとも1 Unitがprimary ownerを持つ。共有所有は、U1のcontractをU2が消費し、U2のsourceをU3が投影する一方向に限定する。


## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-10T10:17:18Z
- **Iteration:** 1
- **Scope decision:** none

3 Unitはいずれもcanonical kindを1つだけ持ち、受け入れ証拠と設計境界に整合しています。prose DAGとYAMLは一致し、2本のdirect edgeのみから成るcycle-freeな構造です。全要件とDS-1〜6が割り当てられ、全Unitに具体的な仕事があります。実装順序・critical path・経済的優先度は決定せずDelivery Planningへ委ねており、正式なstories成果物がないことも適切に扱われています。

### Findings

- None
