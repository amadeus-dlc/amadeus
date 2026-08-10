# Bolt Plan — 成果物数値の provenance ガード

上流参照: `requirements.md` の測定先行・TDD・配送受け入れ、`components.md` の単一tool module境界、`unit-of-work.md` の3 Unit、`unit-of-work-dependency.md` のDAG、`unit-of-work-story-map.md` のDS-1〜DS-6。正式なstories成果物はないためDSを価値traceとして使う。

## Plan summary

| 項目 | 決定 |
| --- | --- |
| Bolt set | `numeric-provenance-walking-skeleton` のみ |
| Included Units | `numeric-provenance-mapping-contract` (`spec`)、`numeric-provenance-sensor-cli` (`service`)、`numeric-provenance-distribution` (`packaging`) |
| Heuristic | walking-skeleton-first + risk-first |
| WSJF | 不使用。比較する複数Boltがないため |
| Parallelism | Boltは逐次。並列Boltなし |
| Branch contract | `main` から短命Bolt worktree/branchを作り、`main` へsquash merge |
| Human gates | walking-skeleton確認、PR merge承認 |

新しい検証経路を含むself-featureであるため、team/projectのWalking Skeleton規約を適用する。mapping、runtime、distributionのどれかを欠くと端から端までの観測にならないため、3 Unitを同じBoltへbundleする。

## Bolt: `numeric-provenance-walking-skeleton`

- **Walking skeleton:** Yes。corpus→mapping→pure evaluator→CLI/manifest→stage配線→build projection→delivery-tree fire→auditを通す。
- **Bundled Units:** `numeric-provenance-mapping-contract`、`numeric-provenance-sensor-cli`、`numeric-provenance-distribution`。
- **Primary scenarios:** DS-1〜DS-6。
- **Deployment:** 既存Amadeus buildへembedded。長時間稼働service、cloud deployment、DB、network APIはない。

### Definition of Done

- 固定predicateでcorpus sweepを再現し、sample identity、label、距離統計、偽陽性率、mode、`W`、produces mapping、配線stage集合を根拠の正本へ記録する。
- 要件閾値を満たすenforcement groupが存在し、満たさないgroupは機械的にmeasurement-onlyへ分類される。存在しなければBoltを止めてBLOCKERとする。
- 合意済みpure seamへ失敗testを先に追加してRedを実測し、claim class、provenance語彙、構造境界、cutoff、lightweight report、file-not-found、mapping不一致をTDDでGreenへする。
- `amadeus-sensor-numeric-provenance.ts`、manifest、enforcement stage frontmatterを実装し、既存dispatcher・graph compiler・auditの意味論を変更しない。
- measurement-only、enforcement、skippedのverdict境界、glob両engine、cutoff両方向、delivery-treeのSENSOR_PASSED/FAILED auditを検証する。
- adversarial Markdownで性能・線形性予算を実測し、runner/Bun versionと測定値を証拠へ残す。
- `bun run build` 後に全harness projectionが一致し、生成面をGit境界へ持ち込まない。
- typecheck、lint、対象test、full suite、再現性、source-only、graph、coverage、complexityを含む変更pathに適用されるblocking集合がgreenである。
- reviewer READYとwalking-skeleton gateを得て、PRは人間のmerge承認なしにmergeしない。

### Confidence hypothesis

固定4 claim classと限定provenance語彙から再現可能なenforcement mappingを導出でき、そのmappingを埋め込んだ配送先CLIは、正当なprovenanceを受理しながら欠落claimだけをadvisory findingとして返す。cutoff・除外・measurement-onlyでは既存recordを騒がせず、100KB級入力でも予算内で線形に処理できる。

### Expected demo

同じfixtureを配送先の `amadeus-sensor.ts fire numeric-provenance` へ渡し、provenanceなしではSENSOR_FAILED、許可された根拠付きではSENSOR_PASSEDがauditへ記録される。同時にsweep成果物からGenerated Mappingを再計算し一致を示す。

## Intra-Bolt dependency checkpoints

これは別Boltの経済順序ではなく、`unit-of-work-dependency.md` のdirect edgeを同じBolt内で守るcheckpointである。

- **Contract checkpoint:** U1のsweep/mappingを確定し、enforcement成立可否をfail-closedで判定する。
- **Runtime checkpoint:** U1 contractを入力にU2のpure evaluator、CLI、manifest、stage配線をTDDで完成させる。
- **Distribution checkpoint:** U2のgreenなcore sourceをU3がbuild投影し、配送先とCIで同値性を確認する。

逆依存、未承認mappingを使ったruntime実装、stale生成物を使った配送検証を禁止する。

## Stop and handoff conditions

enforcement不成立、mapping drift、性能超過、delivery-tree非同値、blocking gate赤、reviewer NOT-READYはBolt内の停止条件である。Bolt完了後はwalking-skeleton gateを開き、人間確認を得る。PR mergeは別の不可逆承認境界であり、full autonomyから自動実行しない。
