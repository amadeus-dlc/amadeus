# Business Rules — numeric-provenance-mapping-contract

上流参照: `unit-of-work.md` のU1境界、`unit-of-work-story-map.md` のDS-1〜DS-6、`requirements.md` のFR-PRED/FR-SWP、`components.md` のCorpus Sweep/Generated Mapping、`component-methods.md` のsweep seam、`services.md` のruntime非依存契約。

## Rule catalogue

### BR-U1-01: Snapshot identity

- sweepはrepository root、observed Git SHA、runtime graph revision、predicate revisionを含む `CorpusSnapshot` を開始時に固定する。
- scan途中でいずれかが変わった場合、結果を継続利用せず `snapshot-changed` failureとする。
- 相対pathはPOSIX separatorへ正規化し、同一snapshot内で一意とする。

### BR-U1-02: Candidate corpus

- intent record配下の各phase/stage成果物Markdownに加え、active spaceの各repositoryにある `codekb/<repo>/re-scans/*.md` を候補とする。両集合を同一CorpusSnapshotで全件列挙し、questions、memory、verification、audit、state、ack basenameはrequirementsのexact ruleで除外する。
- lightweight reportはexact basenameまたはruntime graphのexact produces keyだけで識別する。substring、本文長、実装者判断で拡張しない。
- intent成果物のstage slugとproduces keyはruntime graphのdeclared producesから導出する。`artifactKind` はこのproduces keyと同一値とする。
- codekb re-scanは `scan-only` source、固定 `artifactKind = codekb-re-scan` とし、stage slugとproduces keyを持たない。全件集計・sampling・label・distance統計には含めるが、runtime ArtifactPolicyとstage配線へ投影しない。

### BR-U1-03: Fixed claim/provenance predicate

- claim classはcount、ratio、percentage、measured-valueの固定集合とする。
- provenance kindはcommand token、measurement reference、hex SHA、許可root内の実在relative linkの固定集合とする。
- claim/provenance vocabulary、距離、構造境界、除外条件は `requirements.md` を逐語contractとし、sweep結果を理由に増減しない。

### BR-U1-04: Deterministic sample identity

- 各candidateのidentityは `sha256(relativePath + line + normalizedText)` から導出する。
- artifact kind×claim classごとにbytewise ascendingで並べ、要件上限まで採る。上限未満は全件を採る。
- 同一identityが異なるcandidateを指す場合は `sample-identity-collision` failureとし、片方を捨てない。

### BR-U1-05: Binary labels

- 各sampleは `meaningfulNumericClaim` と `validProvenanceNotMissed` の二値、および非空理由を持つ。
- いずれかがfalseのsampleをfalse positiveとして数える。未併記claimを自動的にfalse positiveとみなさない。
- label欠落、二値以外、理由欠落が1件でもあればそのgroupを分類しない。

### BR-U1-06: Enforcement eligibility

artifact kind×claim classのgroupをenforcementにするには、requirementsが定めるlabel数、false-positive率、provenance-positive数、distance rangeをすべて満たす必要がある。

- 条件が全て成立するgroupだけをenforcementとする。
- 1条件でも未達ならmeasurement-onlyとし、未達条件と測定値を記録する。
- 実装者やapproverが測定値を丸め、sampleを除外し、閾値を緩めてenforcementへ昇格できない。
- 全groupがmeasurement-onlyの場合、U1/Boltを `no-enforcement-group` BLOCKERとして停止する。

### BR-U1-07: Neighborhood window

- provenance-positive pairの論理距離分布から、要件percentileを覆う最小整数を `W` candidateとする。
- `min < W < max` を満たす場合だけ採用する。満たさないgroupはmeasurement-onlyとする。
- `W` はclaim finding許容量ではなく探索窓である。enforcement runtimeでは窓内根拠がない各claimがfindingになる。
- 各runtime policyは `searchScope` を必ず持つ。enforcementは `bounded(W)` のみ、measurement-onlyはvalidな `W` が得られれば `bounded(W)`、得られなければ `full-structural-region` とする。
- `full-structural-region` は同一paragraph/list item/table rowの全論理行を測定対象とし、境界を越えない。候補数・根拠あり/なし・未併記率を算出するがfindingを生成しない。これは `W` の代替値やenforcementへの昇格ではない。

### BR-U1-08: Mapping projection

Approved Mappingは少なくとも次を含む。

- snapshot/predicate revisionと根拠sweep artifact identity
- `stage + record-relative output pattern -> produces key`
- artifact kind×claim classごとのmodeと `searchScope` (`bounded(W)` / `full-structural-region`)
- mechanical exclusion/lightweight report rule revision
- enforcementを1つ以上持つstage slug集合

TypeScript projectionとstage frontmatter配線はこのMappingから生成する。projection側の変更でauthorityを更新しない。

### BR-U1-09: Approval

- approverは `amadeus-quality-agent` とし、同一snapshot/predicateでsample identity、labels、statistics、mode、`W`、stage集合を再計算する。
- 再計算一致と全invariant成立だけがapproval条件である。裁量承認、部分承認、未達waiverは許可しない。
- approval receiptはsnapshotとmapping digestへ結び付け、base前進やmapping変更後に流用しない。

## Processing workflow

```text
fix CorpusSnapshot
  -> enumerate ArtifactDescriptor
  -> scan fixed NumericClaim / ProvenanceCandidate
  -> group by artifact kind + claim class
  -> select deterministic samples
  -> attach complete binary labels
  -> compute distances and false-positive evidence
  -> classify enforcement or measurement-only
  -> derive W and wired stages
  -> emit SweepReport + Mapping
  -> independent recomputation approval
  -> generate TypeScript/stage projections
```

各stepは前stepのimmutable outputを入力にし、後stepの値を先取りしない。

## Scenario rules

| Scenario | Expected rule outcome |
| --- | --- |
| requirements thresholdを全て満たすgroup | enforcement policyとrange内 `W` を生成 |
| label数またはpositive数不足 | measurement-only、未達条件を明記 |
| false-positive率超過 | measurement-only、sample/分母を保持 |
| distanceに有意なrangeなし | measurement-only、`W` を生成しない |
| measurement-onlyでvalidな `W` なし | `full-structural-region` でmetricsのみ測定 |
| 全groupがmeasurement-only | U1/Bolt BLOCKER |
| runtime graphにpath対応なし | unresolved artifactとして記録し、mappingへ推定行を足さない |
| codekb re-scan | scan-only groupとして集計し、runtime mappingへ投影しない |
| mappingとTypeScript projection不一致 | drift failure、U2へhandoffしない |

## Error and recovery policy

| Failure | Recoverability | Action |
| --- | --- | --- |
| unreadable artifact、malformed graph | 同一snapshot内で入力修復可能 | failureを列挙し、修復後にsweep全体を再実行 |
| snapshot changed | 新snapshotで回復可能 | 旧partial resultを破棄し、identityを再固定 |
| incomplete label | label補完で回復可能 | group分類を停止し、補完後に全groupを再計算 |
| threshold not met | contract上の正常な降格 | measurement-onlyへ機械分類 |
| no enforcement group | 要件変更なしには回復不能 | BLOCKERとして停止 |
| projection drift | 再生成で回復可能 | authorityからprojectionを再生成し一致testを再実行 |

silent skip、best-effort approval、runtime adaptive classificationは行わない。

## Invariants

- 同一snapshot、predicate、labelsから同じ順序・digest・mappingが得られる。
- 1 candidate identityは1 candidateだけを表す。
- enforcementは全eligibility条件の論理積である。
- measurement-onlyはruntime findingを生成しないが、測定を捨てない。
- Mappingに存在しないartifact/path/classをruntime側でenforcementへ推定しない。
- scan-only codekbは全件集計から落とさず、runtime ArtifactPolicyへ混入させない。
- 全runtime policyはbounded `W` またはfull structural regionの一意な測定scopeを持つ。
- SweepReport、Generated Mapping、stage配線の意味集合は一致する。


## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-10T10:39:37Z
- **Iteration:** 1
- **Scope decision:** none

閾値、sample identity、approval digest、authorityからprojectionへの一方向境界は概ね上流契約へ追跡できます。しかし、必須コーパスの一部を表現できず、Wを生成できないmeasurement-only groupのruntime測定も定義されていないため、実装可能な閉じた契約ではありません。

### Findings

- BLOCKER | FR-SWP-1はsweep対象をintents配下8,503 mdとcodekb 135 mdに固定していますが、BR-U1-02はCandidate corpusをintent record配下だけに限定しています。さらにArtifactDescriptorはruntime graph由来のstageSlugとproducesKeyを必須化しており、graph対応を持たないcodekb成果物をscan-only/unmapped candidateとして表現できません。このままではcodekbが全件集計・決定的samplingから脱落し、上流coverageと同一HEAD再計算契約に違反します。codekbを走査対象として明記し、stage/produces未解決状態を型として表現したうえでruntime mappingへは投影しない境界を定義してください。
- BLOCKER | BR-U1-07とScenario rulesはdistance rangeを満たさないgroupをWなしのmeasurement-onlyにしますが、FR-SEN-3はmeasurement-onlyでも未併記数・未併記率の算出を要求し、component-methods.mdのResolverはGenerated MappingのWを使う場合しか定義していません。domain-entities.mdもArtifactPolicy.windowの欠落を許しながら、その場合の測定方法を定義していません。近傍窓なしではprovenance併記の有無を判定できないため、runtime metricsを実装できません。全measurement-only groupに適用する測定窓の導出規則、またはWなしgroupの明示的な別verdict契約を上流要件と整合させて固定してください。
- FOLLOW-UP | ArtifactDescriptorはproducesKeyとartifactKindを別属性として持ち、design-timeのgroupingはartifactKind、runtime policy identityはproducesKeyを使いますが、両者の導出・同値性・変換表が定義されていません。分類統計とruntime lookupが別の成果物種別を指さないよう、artifactKindをproducesKeyと同一とするか、決定的な変換規則をMapping authorityへ明記してください。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-10T10:41:49Z
- **Iteration:** 2
- **Scope decision:** none

iteration 1の2件のBLOCKERは解消済みです。codekb re-scanはstageSlug/producesKeyを持たないscan-onlyのdiscriminated unionとして表現され、全件集計・sampling・label・距離統計には参加する一方、runtime ArtifactPolicyとstage配線には投影されません。また、全runtime policyにsearchScopeが必須化され、measurement-onlyはvalidなWがあればbounded(W)、なければ同一構造領域全体を測定するfull-structural-regionを使用し、候補数・未併記数・未併記率をfindingなしで算出できます。上流要件と実装境界を追加判断なく追跡でき、残存BLOCKERはありません。

### Findings

- None
