# Domain Entities — numeric-provenance-mapping-contract

上流参照: `unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md`。本Unitは永続databaseやnetwork serviceを持たず、U2が実装するsweep valueとversioned artifactのimmutable schema・fixture・受け入れ条件だけを定義する。

## Aggregate overview

`MappingContract` schemaが、1つの `CorpusSnapshot` に属するartifact、candidate、label、statistics、policy、approvalを一貫したdigest chainとして定義する。実行時のaggregate valueとtransitionはU2が所有する。

```text
MappingContract
├── CorpusSnapshot
├── ArtifactCatalog
│   └── ArtifactDescriptor*
├── CandidateSet
│   └── NumericClaim + ProvenanceCandidate*
├── LabeledSampleSet
│   └── LabeledSample*
├── ClassificationEvidenceSet
│   └── ClassificationEvidence*
├── NumericProvenanceMapping
│   └── ArtifactPolicy*
└── MappingApproval
```

外部から内部collectionを変更せず、各transitionは新しいaggregate valueを返す。

## Entity catalogue

### `CorpusSnapshot`

| Attribute | Meaning | Invariant |
| --- | --- | --- |
| `repositoryRoot` | scan対象repoのcanonical root | absolute inputはartifact identityへ直接含めず、相対化の基準だけに使う |
| `observedSha` | code/corpus断面 | parse可能なGit object identity |
| `graphRevision` | declared produces断面 | sweep全体で不変 |
| `predicateRevision` | fixed vocabulary/除外contract | requirements revisionへtrace可能 |

同一性は4属性のdigestで表す。いずれかが変われば別snapshotである。

### `ArtifactDescriptor`

| Attribute | Meaning | Invariant |
| --- | --- | --- |
| `relativePath` | repository relative POSIX path | root脱出、absolute path、重複なし |
| `source` | declared-artifact / codekb-re-scan | closed union |
| `stageSlug` | runtime graph由来stage | declared-artifactだけに存在、手書き推定禁止 |
| `producesKey` | runtime graph由来artifact key | declared-artifactだけに存在し、declared producesと一致 |
| `artifactKind` | sweep grouping key | declared-artifactではproducesKeyと同一、codekbでは固定 `codekb-re-scan` |
| `eligibility` | candidate / excluded / lightweight / scan-only | reason code必須 |

`source` はdiscriminated unionである。declared-artifactはstageSlugとproducesKeyを必須とし、codekb-re-scanは両者を持たずscan-onlyである。codekb descriptorはcandidate scan、sampling、label、statisticsには参加するが、ArtifactPolicy生成対象にはならない。

### `NumericClaim`

| Attribute | Meaning | Invariant |
| --- | --- | --- |
| `claimClass` | count / ratio / percentage / measured-value | closed set |
| `path`, `line`, `column` | source position | snapshotのArtifactDescriptorに属する |
| `normalizedText` | identity用正規化text | 同じpredicate revisionで決定的 |
| `structuralRegion` | paragraph/list item/table row | provenance探索が越境しない |

### `ProvenanceCandidate`

command、measurement reference、SHA、relative linkのいずれかを表す。`kind`、source position、normalized evidence、claimからのlogical distance、linkの場合はresolved targetとaccept/reject reasonを持つ。受理済みと拒否済みを同じbooleanで曖昧にせずdiscriminated stateで表す。

### `SampleIdentity`

`relativePath + line + normalizedText` のSHA-256 digestを包むvalue object。digest format検証後だけ生成できる。元candidateへの一意な対応を `LabeledSampleSet` が保証する。

### `LabeledSample`

| Attribute | Meaning | Invariant |
| --- | --- | --- |
| `identity` | SampleIdentity | sample set内一意 |
| `meaningfulNumericClaim` | 意味ある数値主張か | boolean必須 |
| `validProvenanceNotMissed` | 固定predicateが正当根拠を見落としていないか | boolean必須 |
| `reason` | label根拠 | trim後非空 |
| `labelerRole` | quality lead | approved roleと一致 |

false positiveは2つのbooleanの論理式から導出し、保存された別booleanへ二重化しない。

### `DistanceDistribution`

provenance-positive pairのlogical distance collection。count、min、median、percentile、maxをderived valueとして返し、元distance multisetをauthorityとして保持する。emptyまたはrangeなしを通常の分類入力として表現する。

### `ClassificationEvidence`

1つのartifact kind×claim class groupについて、labeled count、false-positive numerator/denominator、provenance-positive count、DistanceDistribution、各eligibility condition、resulting mode、`W`または降格reason、測定用 `searchScope` を束ねる。`W` は `max(nearest-rank p95, min + 1)` で導出し、`W < max` の場合だけvalidとする。modeとcondition結果が矛盾するvalueは構築できない。scan-only groupはclassification evidenceを保持するがruntime policyを生成しない。

### `ArtifactPolicy`

| Attribute | Meaning |
| --- | --- |
| `stageSlug` | runtime fireのstage context |
| `recordRelativeOutputPattern` | outputPath照合用generated pattern |
| `producesKey` | lightweight判定/成果物種別のidentity |
| `claimClass` | fixed claim class |
| `mode` | enforcement / measurement-only |
| `searchScope` | `bounded(W)` または `full-structural-region` |
| `evidenceId` | ClassificationEvidenceへの参照 |

enforcementは `bounded(W)` のみを許す。measurement-onlyでvalidな `W` がない場合は `full-structural-region` を必須とし、同一paragraph/list item/table row全体で根拠有無を測定する。同じlookup keyに異なるpolicyを許さない。

### `NumericProvenanceMapping`

declared-artifact由来ArtifactPolicyのfirst-class collection、mechanical exclusions、wired stage set、authority sweep digestを所有する。lookupは `stageSlug + normalized record-relative output path + claimClass` を受け、exact policyまたはunmappedを返す。scan-only codekb descriptorを含めず、fallback enforcementは返さない。

### `MappingApproval`

snapshot digest、mapping digest、recomputation digest、approver role、verdictを持つ。READYは全digest一致・全invariant成立時だけ構築できる。timestampは監査metadataでありmapping意味論へ含めない。

## Lifecycle

| State | Required data | Allowed transition |
| --- | --- | --- |
| `snapshot-fixed` | CorpusSnapshot | artifact catalog作成 |
| `catalogued` | 全ArtifactDescriptorと除外reason | candidate scan |
| `scanned` | CandidateSet | deterministic sampling |
| `sampled` | SampleIdentity set | label attachment |
| `labeled` | complete LabeledSampleSet | statistics/classification |
| `classified` | ClassificationEvidenceSet、enforcement groupあり | mapping emission |
| `mapped` | SweepReport + NumericProvenanceMapping | independent recomputation |
| `approved` | MappingApproval READY | U2内のTypeScript/stage projection生成 |
| `blocked` | typed failure + evidence | 入力修復後に新snapshotまたは該当predecessorから再実行 |

`approved` からmappingをmutateしない。変更は新snapshot/revisionで新aggregateを作る。

## Relationships and ownership

- CorpusSnapshot 1つにArtifactCatalog 1つ。
- ArtifactDescriptor 1つにNumericClaim 0件以上。
- NumericClaim 1つにProvenanceCandidate 0件以上、accepted matchは0または1つ。
- SampleIdentity 1つにLabeledSample exactly 1つ。
- artifact kind×claim class group 1つにClassificationEvidence exactly 1つ。
- declared-artifactのClassificationEvidence 1つからArtifactPolicy 0または複数を生成し、measurement-onlyでもevidenceを保持する。scan-only codekb evidenceからは生成しない。
- NumericProvenanceMapping 1つにMappingApproval 0または1つ。approval前はU2内のruntime projectionへhandoff不可。

## Invalid states made unrepresentable

- labelのないsample、理由のないlabel
- threshold未達なのにenforcementのClassificationEvidence
- range条件を満たさない `W`
- declared-artifactなのにruntime graph由来でないstage/produces mapping、またはscan-only codekbを含むruntime mapping
- searchScopeのないruntime policy、enforcement + full-structural-region、valid `W` なしのmeasurement-only + bounded scope
- 同じlookup keyへの競合policy
- sweep digestと異なるGenerated Mappingのapproval
- enforcement groupがないapproved aggregate

## Serialization and compatibility

U2が生成するSweepReportは、人間が監査できるMarkdownと、生成・一致testが読める決定的machine sectionを同じauthority artifactに持つ。key順序、collection順序、path separator、number renderingをcanonical化する。schema revisionが変わる場合は旧approvalを無効化し、silent migrationやruntime fallbackを行わない。
