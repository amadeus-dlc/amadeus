# Risk and Sequencing Rationale

> 上流入力（consumes 全数）: `requirements.md`、`components.md`、`unit-of-work.md`、`unit-of-work-dependency.md`、`unit-of-work-story-map.md`、`team-practices.md`

## Chosen Heuristic

`team-practices.md`が指定するwalking-skeleton-firstを第一制約とし、その内側でrisk-firstを使うhybridとする。数値WSJFは用いず、Reinertsen／SAFe WSJFのcost-of-delay観点を参考に、Risk Reduction、User Value、Time Criticality、SizeをHigh／Medium／Lowで比較する。5 Unitへ架空の精密数値を割り当てない。

`requirements.md`のFR-3／NFR-2は重複Issueという不可逆な外部副作用を扱い、`components.md`でもstate／provenance／Gateway／lifecycleを跨ぐ。したがって`unit-of-work.md`のruntime 4 Unitを、`unit-of-work-dependency.md`が許す一つのwalking skeletonへbundleする。`unit-of-work-story-map.md`のAS-02／AS-05が最初のconfidence hypothesisである。

## Qualitative Assessment

| Candidate | Risk Reduction | User Value | Time Criticality | Size | 判定 |
|---|---|---|---|---|---|
| Runtime walking skeleton | High | High | High | XL | 最初。不可逆なduplicate／誤mutationを早期実証 |
| Distribution and docs | Medium | High | Medium | M | runtime contract確定後。先行すると再生成が増える |

Sizeだけならdistribution/docsが小さいが、runtimeより前に投影すると未確定contractを6面へ複製し、手戻りとdriftを増やす。risk reductionとdependency constraintがruntime先行を上回る。

## Risk Register

| Risk | Probability | Impact | Earliest control | Residual handling |
|---|---|---|---|---|
| remote成功／local失敗でIssue重複 | Medium | Critical | Bolt 1 failure injection／candidate reconciliation | `safety-blocked`＋human repair |
| 外部Issueの誤edit／close | Low | Critical | provenance／repository／landing／final-sync guard | mutationなし、warning |
| config booleanの黙示互換 | Medium | High | strict parser／invalid tests | layer／path診断 |
| GitHub一時障害がworkflowを停止 | Medium | High | typed pending＋`workflowMayAdvance` | 次boundary retry |
| statusがmodeを誤表示 | Medium | Medium | explicit `MirrorStatusContext` | golden output tests |
| 6ハーネス／日英文書drift | Medium | High | Bolt 2 generated projection／parity tests | blocking drift gate |
| live GitHub環境が利用不能 | Medium | Medium | fake runnerを通常test正本にする | live smokeを延期しwarning |

## Walking Skeleton Argument

Bolt 1はUIだけ、parserだけ、Gatewayだけのvertical未満sliceではない。`auto` config → Intent Capture boundary → prepared／attempted receipt → explicit repository create → provenance → injected local failure → same-Issue reconciliation → status warningまで全architecture layerを通る。

このdemoが成功すれば、最重要仮説「外部副作用とlocal stateがatomicでなくても重複せず回復できる」を実証する。失敗すれば、6面へ配布する前にstate schema、marker、executor順序を変更できる。

## Sequence Validation

Bolt 1内ではC0 contractを共通providerとし、state-provenanceとGitHub Gatewayを並行化できる。operation-lifecycleは両者に依存する。Bolt 2は完成したoperation-lifecycleを投影する。DAGからの逸脱は0件であり、経済判断は有効なtopological pathの選択に限定される。
