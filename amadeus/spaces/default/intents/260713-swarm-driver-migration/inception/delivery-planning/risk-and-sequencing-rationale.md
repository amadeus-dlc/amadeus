# Swarm Driver Migration Risk and Sequencing Rationale

## 採用したHeuristic

基盤先行とrisk-firstを組み合わせたhybridを採用する。最初にU-01／U-02で閉じたcontractと共通lifecycleを確立し、その後は最も重要な未証明前提であるCodex Ultraのnative evidenceをU-04で反証する。成立後にU-03 ClaudeとU-05 Kiroを並列化し、最後にU-06でrelease invariantを閉じる。

ReinertsenのCost of Delay／CD3やSAFe WSJFが示す「価値・時間制約・risk reductionをjob sizeで割る」考え方は順序の観点として参照するが、数値WSJFは使わない。本intentではprovider間のuser/business valueとtime criticalityを客観的に差別化する証拠がなく、架空の点数は誤差を精密に見せるだけだからである。相対複雑度L／XL／Mは容量計画に使い、根拠のない価値scoreへ変換しない。

## 上流根拠

- `requirements`: FR-01〜FR-26、NFR-01〜NFR-12、USR-01〜USR-10、A-02、OQ-01〜OQ-04。
- `components`: C-01〜C-12とADR-001〜ADR-009。特にADR-006のprovider別native evidence contractとADR-009のmode別closed transport。
- `unit-of-work`: U-01〜U-06のownership、test、完了条件、相対複雑度。
- `unit-of-work-dependency`: `U-01 → U-02 → {U-03,U-04,U-05} → U-06`、provider別single-writer、production registry seam。
- `unit-of-work-story-map`: USR／RELからUnitへの受入sliceとevidence。
- `team-practices`: brownfieldのwalking-skeleton stance、`main`／squash merge、Comprehensive test、release／distribution方針。

`stories`と`mockups`はscopeでSKIP済みであるため、requirements内のUSR／RELを利用者価値の代理にし、GUI価値scoreは置かない。

## 順序の理由

### 1. U-01を最初にする理由

全後続Unitはdriver値、registration、selection result、fallback／legacy unionへ依存する。U-01を先に閉じることで、U-02以降がselection ruleを複製せず、provider worktree間のcontract driftを防げる。L規模で独立検証可能なため、U-02と束ねるよりreviewとrevertの範囲が小さい。

### 2. U-02を分離する理由

U-02はXLで、process、closed transport/capture、checkpoint、audit、referee、production registryを持つ最も大きい共有境界である。U-01と別Boltにすることでpure policyとstateful runtimeを別々に収束させる。fake PTY/stdioと3 capture variantをprovider実装なしで検証し、U-03〜U-05は完成済みcommon seamだけを消費するため、DAGに隠れた循環を作らない。

### 3. U-04 Codexを最初のprovider proofにする理由

intentの中心的な未証明前提は、resolved modelがUltraを受理し、1 coordinatorが2 child以上へnative delegationしたことを、通常の`xhigh`／Unit別`codex exec`から機械的に区別できるかである。現在のCodex harnessでdogfoodでき、失敗時に他provider実装へ投資する前にscopeを再審議できるため、risk reduction valueが最大である。

U-04は正式なAI-DLC walking-skeleton markerではない。本intentはbrownfieldで新package／新distribution pathを作らないため、project practiceに従いceremonyはoffとする。ただし、U-04は公開conductorからrefereeまでを初めてnativeで通すため、説明上のnative proof milestoneである。

### 4. U-03／U-05をparallel waveにする理由

両UnitはU-02だけへ依存し、互いをimportせず、provider別adapter／harness／fixtureをsingle-writeし、common runtimeを編集しない。したがって実装とdeterministic fake suiteは安全に並列化できる。一方、credentialed live runは同じmacOS hostのCPU、process、user-global stateを使うためmutexで直列化し、証拠汚染と診断の曖昧さを防ぐ。同時readyなら、主要受入で2 modeを持つClaudeを先にする。

一方が外部surfaceでblockedになっても、DAG上独立な他方は続行する。これは完成を偽るためではなく、再計画に必要な追加証拠を得るためであり、U-06は両方が完了するまで開始しない。

### 5. U-06を最後にする理由

U-06は新しいprovider behaviorを実装せず、3 providerの実registration、4 native mode evidence、closed registry、generated distributions、文書、Linux matrix、0.2.0追跡を検証するrelease closureである。provider欠落をplaceholder、fake、floor、文書主張で埋めるとFR-23〜FR-26を破るため、必ずfan-inの最後に置く。

## DAG整合性

計画順は次の有効なtopological orderである。

```text
U-01 -> U-02 -> U-04 -> {U-03, U-05} -> U-06
```

U-03／U-04／U-05の間にedgeはなく、U-04を先に選ぶのは経済的なrisk gateであってdependency追加ではない。U-03／U-05のparallel waveもDAGのready setから一時的に導出され、Unitの親nodeや永続batchを追加しない。

## Risk Register

| ID | Risk | Probability | Impact | Earliest Bolt | Mitigation / Stop rule |
|---|---|---|---|---|---|
| R-01 | selector／registration contractがproviderごとに分岐 | Medium | High | B-01 | closed union、single owner、architect review。複製をREVISE |
| R-02 | common lifecycleがnative自己申告やPTY control signalを成功扱い | Medium | Critical | B-02 | terminal後evidence＋referee＋mergeのAND、lying-conductor guard、failure injection |
| R-03 | Codex Ultraをxhigh／floorから区別不能 | High | Critical | B-03 entry | live schema discovery。不能ならintent全体を再審議し、floorで代替しない |
| R-04 | interactive Agent Teamsのexact team/task/hook相関が不安定 | High | High | B-04 entry | PTY arm前observer＋attempt専用path/hookの最小live discovery。失敗時はB-04だけpark。headless async Agentで代替しない |
| R-05 | Kiro trust／session metadataを非対話で取得不能 | Medium | High | B-05 entry | trust preflight＋session/stream discovery。失敗時はB-05だけpark |
| R-06 | 並列live runがhost／global stateを競合 | Medium | High | B-04/B-05 | 実装並列、live proof mutex、Claude優先、execution由来IDへscope |
| R-07 | provider worktreeがregistry／他providerを同時編集 | Medium | High | B-03〜B-05 | U-02固定slot、provider single-writer、U-06は検査のみ |
| R-08 | credential／prompt／raw payloadが証拠へ混入 | Low | Critical | B-02〜B-05 | normalized event、raw非保存、secret scanner、non-sensitive fixture |
| R-09 | 実装失敗でpre-code設計状態を失う | Medium | High | B-01前 | checkpoint PRを人間承認・mergeし、その`main`からBolt branchを作る |
| R-10 | generated harness／dist／docsが正本とdrift | Medium | High | B-06 | `packages/framework` single source、package/promote checks、docs scan |
| R-11 | Windows未検証を対応済みと誤表明 | Medium | Medium | B-05/B-06 | Windows対象外をmatrix／docsへ明記、既存Windows codeを目的なく変更しない |
| R-12 | U-02共通補正がU-03へ混入し、provider間にhidden dependencyを作る | Medium | High | B-02/B-04 | 共通補正は[PR #964](https://github.com/amadeus-dlc/amadeus/pull/964)だけへ置き、[PR #965](https://github.com/amadeus-dlc/amadeus/pull/965)をrebase。U-03 diffでcommon runtime変更0件をreview |

## Confidence Ladder

| Bolt | Shipping後に上がるconfidence | 反証signal |
|---|---|---|
| B-01 | selection contractが決定的で互換的 | 同一fixtureの結果差、side effect、未知union値 |
| B-02 | provider非依存transport/capture lifecycleがfalse successを防ぐ | capture-before-arm違反、control signalだけでsuccess、evidence/referee/merge欠落でsuccess、resume二重発行 |
| B-03 | Codex Ultra native delegationが機械判定可能 | xhigh-only、childなし、hook相関不能、floor成功 |
| B-04 | interactive Agent Teamsとheadless Ultra Codeが各native surfaceを実証可能 | headless async Agent、env／control自己申告だけ、Task floor、Unit相関欠落 |
| B-05 | Kiroがtrust付きbalanced waveで全Unitを処理 | 1 Unit末尾wave、drop、session不一致、approval prompt |
| B-06 | release全体がclosed／drift-free | placeholder、evidence欠落、generated差分、Issue欠落 |

## Checkpoint and Recovery

pre-code checkpoint [PR #955](https://github.com/amadeus-dlc/amadeus/pull/955)はmerge済みで、既知の復帰点である。ADR-009の回復ではB-02の[PR #964](https://github.com/amadeus-dlc/amadeus/pull/964)を補正し、B-04の[PR #965](https://github.com/amadeus-dlc/amadeus/pull/965)を更新headへrebaseする。以後の実装失敗では、成功済みBoltのsquash commitと失敗Bolt worktreeを保持し、protocolのhalt-and-askへ従う。force push、history rewrite、未承認mergeは行わない。
