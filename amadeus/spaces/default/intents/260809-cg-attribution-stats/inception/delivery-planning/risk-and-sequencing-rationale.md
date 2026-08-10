# Risk and Sequencing Rationale — CG 観測可能区間と帰属不能残余

上流入力（consumes全数）は `requirements.md`、`components.md`、`unit-of-work.md`、`unit-of-work-dependency.md`、`unit-of-work-story-map.md` である。sequencingはwalking-skeleton-first（Cockburn）とrisk-first（Boehm）のhybridとし、DAGをBolt内で守る。

## Economic sequencing decision

B-01だけがdeployable candidateであるため、相対的なCost of Delayやjob sizeを比較するWSJF scoreは作らない。架空scoreで精度を演出せず、Issue #2695の価値を一括で検証する。

複数Bolt案を不採用にした理由は次のとおりである。

| Alternative | Benefit | Rejection reason |
|---|---|---|
| 1 Unit = 1 Bolt | PR/rollback境界が単純 | U-01〜U-03はCLIから到達するdeployable valueを単独で持たず、最初のBoltがend-to-endにならない |
| U-01〜U-03 foundation + U-04 integration | 2段階で認知負荷を下げる | foundation Boltはwalking skeletonではなく、価値検証がU-04まで遅れる |
| B-01へU-01〜U-04を束ねる | 最初からCLI→report→pipeを検証 | Bolt規模は大きいが、Unit ownershipと内部DAGで変更衝突・レビュー負荷を制御できる |

## Intra-Bolt order

1. U-01でclosed vocabulary、typed identity/error、primary precedenceをテスト先行で固定する。
2. U-02で全candidate family/Event Set/lifecycleのevidence riskを、U-03でhalf-open/idle/union/population accounting riskを閉じる。両UnitはU-01後にDAG上並行可能である。
3. U-04で既存measured branchをcharacterizationし、semantic report、3 renderer、CLI、oversized pipeを統合する。
4. `unit-of-work-story-map.md`のFR/NFR全数と`bolt-plan.md`のDefinition of Doneを横断確認してB-01 gateへ入る。

これは`unit-of-work-dependency.md`のdepth 0→1→2と一致し、topological deviationは0件である。

## Risk register

| ID | Risk | Likelihood | Impact | Earliest control / mitigation |
|---|---|---|---|---|
| R-01 | attribution dedupがlegacy measured populationへ逆流する | Medium | Critical | U-04 characterization fixtureで変更前後fieldを比較し、U-02へreadonly attribution copyだけを渡す |
| R-02 | 複合欠陥candidateを複数primary reasonへ二重計数する | Medium | High | U-01 precedence + U-02/U-03 disposition fixtureで1 candidate=1 primaryを固定 |
| R-03 | 同時刻の別intent/stage windowへ誤帰属する | Medium | High | U-02 explicit evidenceとU-03 typed intent matchをsynthetic overlap fixtureで検証 |
| R-04 | clip/idle/category overlapで秒数を二重計上または負値化する | Medium | Critical | U-03 PBTでunion、difference、入力順不変、会計恒等式を検証 |
| R-05 | report rendererごとに母集団・reason・outlierがdriftする | Medium | High | U-04でcanonical semantic modelを唯一の入力にし、3format parity fixtureを使う |
| R-06 | 大容量stdoutが未drainでtruncateする | Medium | High | 3format各65,536 bytes超のfull/pipe digest parityとJSON parseをintegration test化 |
| R-07 | current corpus規模でscan/decode/sortが実用時間を外れる | Low | Medium | O(n)/O(k log k)境界を保ち、229 shard・136,011 row以上相当fixtureで再実行 |
| R-08 | 1 Boltへ4 Unitを束ねたことでレビュー範囲が拡大する | High | Medium | Unit別source/test ownership、DAG順、public seam review、gate前の全数traceで分割統制 |

## Compatibility and rollback posture

新moduleはU-04が呼び出すまで既存CLI contractへ影響しない。統合後もlegacy fieldはappend-onlyである。問題が見つかった場合はB-01全体を未完了としてgateで止め、部分的なsemantic reportだけを出荷しない。generated surfaceやrelease artifactへ手書き変更を入れないため、rollback対象はsource/testのreviewable changeに限定される。

## Scope preservation

`requirements.md`の25 FR、7 NFR、Issue完了条件10件はすべてB-01 DoDに残る。単一Bolt化で削除、defer、推定簡略化する要件は0件であり、`components.md` C-01〜C-06と`unit-of-work.md` U-01〜U-04のownerも変更しない。
