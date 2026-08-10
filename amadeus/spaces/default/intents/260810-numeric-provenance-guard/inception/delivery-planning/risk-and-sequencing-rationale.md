# Risk and Sequencing Rationale — 成果物数値の provenance ガード

上流参照: `requirements.md`、`components.md`、`unit-of-work.md`、`unit-of-work-dependency.md`、`unit-of-work-story-map.md`。walking-skeleton規範はteam/project memory、測定先行はrequirementsの既決裁定を適用する。

## Chosen heuristic

Walking Skeleton (Cockburn) とrisk-firstを併用する。新しい検証経路を、mapping contract、runtime evaluator、既存dispatcher、build projection、delivery-tree auditまで端から端に通す。最大の不確実性は、既存corpusから要件閾値を満たすenforcement groupとrange内の `W` を実際に導出できるかであるため、同じBoltの最初のcheckpointで測る。

WSJF (Reinertsen/SAFe) は使わない。比較対象となる複数Boltがなく、仮のvalue/time-criticality値を置くと見かけの精度になるためである。value-firstだけではmapping不成立riskを後段へ送るため採用しない。

## Why one bundled Bolt

U1だけではruntime findingをdemoできず、U2まででもdelivery-tree契約を証明できず、U3だけでは投影元がない。3 Unitを別Boltへ分けると最初のBoltがwalking skeletonにならない。1 Boltへbundleしつつ、Unitごとのacceptance checkpointを残すことで、end-to-end証明と所有境界を両立する。

Bolt間parallelismはない。これは人員制約ではなくDAGとwalking-skeleton completenessによる。Bolt内部のtestやread-only計測を並行化する場合も、共有mappingを変更する処理は直列checkpointの後に行う。

## Risk register

| Risk | Signal | Earliest control | Failure disposition |
| --- | --- | --- | --- |
| R1 enforcement mappingが成立しない | label数、偽陽性率、provenance-positive数、距離rangeのいずれかが閾値未達 | Contract checkpointで全条件を再計算 | Bolt BLOCKER。runtime実装で閾値を緩めない |
| R2 provenance resolverが一般文書やescape linkを受理する | rejection fixtureがPASSになる | Pure evaluatorのRed fixture | 許可root・normalize・regular-file契約を修復 |
| R3 regexが敵対Markdownで非線形になる | median/p95または入力倍増比が予算超過 | Runtime checkpointの専用benchmark | predicateを線形な構成へ修復し再測定 |
| R4 fail-openとadvisory契約が崩れる | skipped条件がfinding/非zero exit、graph severity変化 | verdict/cutoff/graph golden test | 既存dispatcher変更を戻しtool境界で修復 |
| R5 Generated Mappingとsweepがdriftする | byte/集合一致test失敗 | Contract・Runtime checkpoint | 生成をやり直し手編集を拒否 |
| R6 配送面がcoreと一致しない | build drift、delivery-tree fire不一致、source-only違反 | Distribution checkpoint | core正本とbuild入力を修復し再build |
| R7 cold integration test timeoutを実欠陥と誤認する | full parallel suiteだけtimeout、isolated raised timeoutはgreen | Quality navigatorが該当fileをisolated rerun | flakyとして証拠を分離。実failureなら修復 |

## Confidence ladder

- Contract checkpoint: 固定predicateとcorpusから有効なmappingを再現できる。
- Runtime checkpoint: mapping consumerが正負・skipped境界と性能予算を満たす。
- Distribution checkpoint: coreの意味論が全配送面で変わらずauditへ到達する。
- Walking-skeleton gate: 人間がexpected demoと残存riskを確認する。

後のcheckpointは前の証拠を再解釈せず消費する。前段failureをmeasurement-onlyへの恣意的降格、skip拡大、allowlistで回避しない。

## Decision trace

- `auto-decision-b9407aa13d216d693fdc81f0cf9db63a`: walking-skeleton-risk-first。
- `auto-decision-11b430cb1e36fb7237d6ae0c799c59f1`: single-bundled-bolt-sequential。
- `auto-decision-d00d3cdb324e8aaf07048f642e2ea2d7`: local-only-with-human-gates。
