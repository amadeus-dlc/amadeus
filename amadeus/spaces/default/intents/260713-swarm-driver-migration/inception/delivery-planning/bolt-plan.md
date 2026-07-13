# Swarm Driver Migration Bolt Plan

## 上流コンテキスト

本計画は、Requirements Analysisの`requirements`、Application Designの`components`、Units Generationの`unit-of-work`、`unit-of-work-dependency`、`unit-of-work-story-map`、Practices Discoveryの`team-practices`を正本とする。`stories`と`mockups`はscopeでSKIP済みであり、GUIは対象外であるため、USR-01〜USR-10とREL-01〜REL-02をstory相当の受入シナリオとして使う。

`unit-of-work-dependency`のDAG `U-01 → U-02 → {U-03, U-04, U-05} → U-06`は変更しない。経済的順序だけを、基盤先行とnative evidenceのrisk-firstを組み合わせて決める。

## Planning Semantics

- BoltはConstruction stages 3.1〜3.5を1回通す実装・検証sliceであり、本intentでは1 Boltを1 Unitへ対応させる。
- 製品domainの`batch`は1回のmulti-Unit swarm executionである。Constructionの`parallel batch`は依存解決済みBoltを一時的に同時実行するengine上のgroupであり、Unitの永続的な親や新しいdomain aggregateではない。本計画ではこの一時groupを「parallel wave」と表記する。
- 本intentは既存`packages/framework`、既存harness、既存distribution pathを変更するbrownfieldであり、`team-practices`とproject practiceに従って正式なwalking-skeleton ceremony／markerはoffとする。
- B-03は正式なwalking-skeleton markerではないが、public conductorからproduction registry、native coordinator、evidence verifier、refereeまでを最初に実証する「native proof milestone」である。
- 全Boltは`main`から短命worktree branchを作り、BoltごとにPR／squash mergeする。複数Boltの実装差分を1 PRへ束ねない。

## 実行シーケンス

| Wave | Bolt | Unit | 実行形態 | Formal Walking Skeleton | 進入条件 |
|---|---|---|---|---|---|
| F-1 | B-01 | U-01 `driver-contract-selection-policy` | 単独 | なし | Delivery Planning承認、pre-code checkpoint PRのmerge |
| F-2 | B-02 | U-02 `swarm-execution-lifecycle` | 単独 | なし | B-01 squash merge済み |
| N-1 | B-03 | U-04 `codex-native-driver` | 単独・native proof milestone | なし | B-02 merge済み、Codex schema discovery PASS |
| P-1 | B-04 | U-03 `claude-native-driver` | B-05と実装／fake検証を並列 | なし | B-03 merge済み、Claude schema discovery PASS |
| P-1 | B-05 | U-05 `kiro-native-driver` | B-04と実装／fake検証を並列 | なし | B-03 merge済み、Kiro schema discovery PASS |
| R-1 | B-06 | U-06 `release-migration-closure` | 単独 | なし | B-04/B-05 merge済み、4 native modeのlive evidenceあり |

P-1のcredentialed macOS live proofは同一ホスト上のmutexで直列実行する。B-04/B-05が同時にreadyならClaudeを先にし、各Boltは自分のlive proofが通るまで完了扱いにしない。

## Pre-code Checkpoint PR

最初のCode Generationへ入る直前、そこまでに承認されたInception成果物とpre-code Construction成果物だけをcheckpoint PRにする。実装コード、生成物の実装差分、provider live evidenceを混在させない。

checkpoint PRは人間が承認・mergeし、merge済み`main`を実装失敗時の復帰点とする。B-01のCode Generationはそのmerge後に新しいBolt worktree branchから開始する。PR merge判断はAIが代行しない。

## B-01 Driver Contract & Selection Policy

### Unitと境界

- Unit: U-01 `driver-contract-selection-policy`
- Owns: C-02、C-03、C-04 registration contract、公開driver 5値、legacy/floor union、pure selector
- Does not own: process、filesystem、audit append、checkpoint、provider parser

### Definition of Done

1. `RequestedDriver`、`SelectedDriver`、`TopologyDecision`、`SelectionDecision`、`DriverRegistration`、fallback reason、legacy planをversioned closed union／schemaとして定義する。
2. 5値、未設定、空文字、不正値、新旧競合、別harness値、topology 4分類、全`auto`分岐、legacy全行を決定的fixtureで検証する。
3. selectorはworker／worktree／provider process作成前に結果を返し、明示driverのsilent fallback、`selected=auto`、未知reasonを0件にする。
4. harness proseへselection tableを複製せず、runtime I/Oへ依存しない。
5. Comprehensive strategyに従うunit／property testsとarchitectのcontract reviewがgreenである。

### Confidence Hypothesis

環境変数、harness、topology、capability結果を閉じた入力へparseすれば、同一入力から常に同じdriver planを副作用前に得られ、0.1.x互換も新driver意味へ読み替えず維持できる。

### Expected Demo

CLIを起動しないfixture matrixで、Claude/Codex/Kiroの全選択、競合hard error、`auto` loud fallback、legacy warning metadataを反復実行し、出力が一致することを示す。

## B-02 Swarm Execution Lifecycle

### Unitと境界

- Unit: U-02 `swarm-execution-lifecycle`
- Owns: C-01、C-04 production registry assembly、C-08〜C-10、C-11 envelope連携
- Does not own: provider command、raw event parser、harness tool invocation

### Definition of Done

1. `resolve`、`run`、`resume`、`record-floor`、`record-legacy`、`record-finalize`、`status`の公開lifecycleを実装する。
2. production registryがClaude/Codex/Kiroの3つの型付きfail-closed placeholderを静的importし、4 driver値へexhaustiveに写像する。
3. probe-once、attempt ID、lease／fencing、audit-first checkpoint、atomic replace、crash reconciliationを実装する。
4. 2 Unit以上のfake adapterをproduction lifecycle、既存worktree、protected spec、lying-conductor guard、`prepare`／`check`／`finalize`へ通す。
5. probe timeout、evidence欠落、partial failure、stale writer、audit／checkpoint、referee／merge failure injectionでfalse successと成功二重発行を0件にする。
6. credential、prompt、raw responseがstdout／stderr／audit／checkpointへ残らず、architectのruntime seam reviewがgreenである。

### Confidence Hypothesis

provider固有処理をversioned adapter contractへ閉じ込めれば、共通state machineがnative evidence、referee convergence、merge-backのANDを一度だけ確定し、provider自己申告やcrashでbatchを誤成功にしない。

### Expected Demo

2 Unitのfake native runを正常完了させた後、lying conductor、evidence欠落、merge失敗、crash-resumeを注入し、terminal event、checkpoint、audit相関が期待どおりになることを示す。

## B-03 Codex Native Driver

### Unitと境界

- Unit: U-04 `codex-native-driver`
- Milestone: 最初のnative end-to-end proof
- Owns: C-06、Codex adapter、Codex conductor／hook／projection

### Entry Gate

認証済みmacOS環境の最小live runで、resolved modelのUltra受理、Codex thread JSONL、attempt専用SubagentStart／Stop hook、2 child以上のUnit相関に使うfield pathを固定する。取得不能、`xhigh`へのdowngrade、native child識別不能なら実装前にintent全体を再審議する。

### Definition of Done

1. Codex slotだけを`codex-ultra`実registrationへ置換し、他provider slotとregistry mappingを変更しない。
2. batchごと1つの`codex exec --json` coordinatorを起動し、stdin close、Ultra受理、2 child以上、Unit全単射、completed stopを検証する。
3. fake JSONL／handshake／hookでdowngrade、child不足、nonce不一致、partial failure、legacy floorを決定的に検証する。
4. Codex conductor → public C-01 → production registry → native coordinator → evidence verifier → refereeの経路で、2 Unit以上のmacOS live proofを完了する。
5. 通常`xhigh`、Unit別`codex exec` floor、coordinator自己申告をnative successとして拒否し、architectのevidence reviewがgreenである。

### Confidence Hypothesis

Ultra-capable resolved modelの受理とnative multi-agent委譲を独立sourceでAND判定すれば、Codex Ultraを通常のreasoning effortやprocess-per-Unit floorから機械的に区別できる。

### Expected Demo

公開Codex conductorから非機密2 Unitを実行し、resolved mode、thread、child agent、Unit成果、`check`、`finalize`を相関表示する。続けてxhigh-only／childなしfixtureがhard failureになることを示す。

## B-04 Claude Native Driver

### Unitと境界

- Unit: U-03 `claude-native-driver`
- Owns: C-05、Claude adapter、Claude conductor／projection
- Parallel partner: B-05。source worktreeは分離し、live proof mutexを共有する。

### Entry Gate

非機密の最小live runで、Agent Teamsのteam config／members／shared taskとstream event、Ultra CodeのDynamic Workflow run／task／agent IDとstream eventのfield pathを固定する。環境変数設定やxhigh自己申告だけではPASSにしない。

### Definition of Done

1. Claude slotだけをAgent Teams／Ultra Codeの2 modeを持つ実registrationへ置換する。
2. Agent Teamsは2 Unit以上のteam members、shared task、Unit全単射を、Ultra Codeは2 Unit以上のworkflow task／agent、Unit全単射を証明する。
3. fake CLI／provider state／stream fixtureで未知schema、child不足、mode marker欠落、process failure、legacy Task／Dynamic Workflowを検証する。
4. Claude conductorからproduction registryを通し、Agent TeamsとUltra CodeをそれぞれmacOSでlive実行してUnit成果、`check`、`finalize`を保存する。
5. Claude Task floorとの区別、secret redaction、architectのevidence reviewがgreenである。

### Confidence Hypothesis

provider stateとstream eventを相関すれば、Agent TeamsとUltra Codeの実native coordinationを環境変数設定、xhigh、Task floorから区別し、topologyに応じた2 modeを1 adapterで安全に提供できる。

### Expected Demo

Agent TeamsとUltra Codeで各2 Unit以上を実行し、team／workflow固有marker、Unit成果、referee収束を示す。mode marker欠落時は別方式へ置換せず失敗することを示す。

## B-05 Kiro Native Driver

### Unitと境界

- Unit: U-05 `kiro-native-driver`
- Owns: C-07、Kiro adapter、Kiro CLI／Kiro IDE conductor／projection
- Parallel partner: B-04。source worktreeは分離し、live proof mutexを共有する。

### Entry Gate

インストール済み`kiro-cli 2.12.1`を使う非機密最小runで、non-interactive trust、parent session、completed child session、Unit割当のfield pathを固定する。CLI versionだけではcapabilityを成立させない。

### Definition of Done

1. Kiro slotだけを`kiro-subagent`実registrationへ置換し、Kiro CLI／IDEを同じcontractへ収束させる。
2. multi-Unit入力を2〜4 Unitのbalanced waveへ決定的に分け、5件を3+2とし、Unit dropと1件末尾waveを0件にする。
3. fake CLI／session metadataでtrust不足、approval要求、parent-child不一致、child不足、partial wave failure、legacy floorを検証する。
4. Kiro conductorからproduction registryを通し、2 Unit以上と5 UnitのmacOS live proofでsession evidence、Unit成果、`check`、`finalize`を保存する。
5. trust不足をworker前に拒否し、前waveのevidence verified前に次waveを起動せず、architectのevidence reviewがgreenである。

### Confidence Hypothesis

non-interactive trustをpreflightし、session metadataとprocess streamをAND判定すれば、Kiro native subagentを既存floorから区別し、provider上限を超えるUnitもdropなしの決定的waveで収束できる。

### Expected Demo

2 Unitと5 UnitのKiro runを行い、5件が3+2へ分かれ、parent／child sessionと全Unit成果が一致することを示す。trust不足とchild不足ではworker前／success前に停止する。

## B-06 Release & Migration Closure

### Unitと境界

- Unit: U-06 `release-migration-closure`
- Owns: registry completeness check、C-12 distribution projection、共有文書、platform matrix、0.2.0追跡Issue
- Does not own: provider behavior、parser、registry mappingの新規実装

### Definition of Done

1. 3 provider placeholder 0件、4 native driver mappingのexhaustiveness、余分なregistration 0件をdeterministic checkで保証する。
2. `packages/framework`正本からClaude、Codex、Kiro、Kiro IDE、`dist`、self-installを生成し、`dist:check`と`promote:self:check`を含むdrift guardをgreenにする。
3. User Guide、harness guide、developer reference、migration guide、環境変数例を5値、selection、hard error、loud fallback、legacy、platform契約へ同期する。
4. GitHub Actions Linuxのdeterministic suiteとmacOSの4 native mode evidence indexをrelease matrixで追跡する。Windows対応は表明しない。
5. `AMADEUS_USE_SWARM`を0.2.0で削除する日本語GitHub Issueを起票し、削除項目、全harness検証、URLを成果へ記録する。
6. `bun run typecheck`、`bun run lint`、`bun run dist:check`、`bun run promote:self:check`、`bash tests/run-tests.sh --ci`がgreenである。

### Confidence Hypothesis

closed registry、正本からの一方向生成、文書contract scan、platform evidence indexを1つのrelease invariantへ束ねれば、4 driverの実装が全harnessへdriftなく配布され、legacy bridgeを安全に後続削除へ引き渡せる。

### Expected Demo

placeholder／mapping検査、全生成物drift check、macOS／Linux matrix、4 native evidence参照、文書scan、0.2.0 Issue URLを1つのrelease reportとして示す。

## Bolt共通ゲート

各Boltは、割当要求へのtrace、Unit固有test、既存回帰、secret redaction、source ownership、architect重点reviewを満たしてからPRへ進む。明示driverのfallback、native evidence欠落のskip-as-pass、未完了Unitの成功化、生成先の直接編集を禁止する。

B-03〜B-05のlive proofは通常CIへcredentialを追加せず、macOSで非機密fixtureを使う。B-04/B-05の一方が外部依存でblockedになった場合はそのBoltだけをparkし、もう一方を続行するが、B-06は全provider完了まで開始しない。
