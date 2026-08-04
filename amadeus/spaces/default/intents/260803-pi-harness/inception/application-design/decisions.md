# Pi Coding Agent対応 — Architecture Decision Records

## 決定一覧と上流トレーサビリティ

本ADR群は`requirements`の30 FR、12 NFR、M1〜M10、`architecture`のcore/overlay境界、`component-inventory`の既存拡張点を実装可能な選択へ落とす。`stories`と`team-practices`成果物はscope上存在しないため、利用者flowはrequirementsのSCN-001〜009、作業規律は解決済みmemory rulesを参照する。

| ADR | 決定 | 主なtrace | 可逆性 |
|---|---|---|---|
| ADR-001 | Pi公開Extension APIをnative lifecycle境界とする | M1〜M3、FR-HAR、FR-LIF、FR-GAT | 中 |
| ADR-002 | HUMAN_TURNはinput source、continuationは`agent_settled`で判定 | FR-LIF-003〜005、FR-GAT | 中 |
| ADR-003 | 子PiはRPC subprocessの共通driverで実行 | M4、FR-SUB、NFR-SCL-001 | 中 |
| ADR-004 | `.pi` harness layoutとcanonical `stageEntry`を採用 | M1、FR-HAR、NFR-MNT-001 | 易 |
| ADR-005 | setup payloadとroot Pi Package viewを同一生成resourceへ投影 | M6〜M8、FR-DST、NFR-REL | 中 |
| ADR-006 | 自動liveはRPC、手動dogfoodはTUI、printは補助smoke | M9、FR-VAL-001〜002 | 易 |
| ADR-007 | cloud/daemonを追加しない | CON-001、Out of Scope | 難（導入しない決定） |
| ADR-008 | discovered harness manifestsをharness catalog正本とする | FR-DST-005、CodeKB technical debt | 中 |

## ADR-001: Extension-first lifecycle adapter

### Context

Pi 0.83.0以上は公開Extension APIでsession、input、agent、tool、compaction eventを提供する。Amadeusは既存core hook/state machine/auditを維持し、Pi固有knowledgeをoverlayへ閉じる必要がある。

### Decision

`packages/framework/harness/pi/`に単一のAmadeus extensionと小さなtyped helper群を置き、Pi native eventを既存canonical hook invocationへ正規化する。extensionはpublic APIだけを利用し、必須event/port/versionが不足する場合はworkflow-changing operationをfail-closedにする。status/doctorはread-only portで利用可能に保つ。

### Consequences

- core state machine、audit schema、gate semanticsをforkせずにPiを追加できる。
- Pi API変更の影響はoverlayとcaptured fixtureへ集中する。
- extension lifecycleに依存するため、Pi version下限とfixture parityが正式保証の前提になる。

### Alternatives Considered

- Option A — Extension-first: native lifecycleとtrust/discoveryへ自然に統合できる。Pi API変更の影響はoverlayに集中。可逆性は中。
- Option B — 外部wrapper/RPCだけ: extension未導入でも起動できるが、input/tool/compactionのnative factとproject trustを正確に扱いにくい。可逆性は中。
- Option C — in-process SDK embedding:細粒度制御は可能だが、今回対象外の独立SDK surfaceとprocess-global couplingを増やす。可逆性は低い。

RecommendationはOption A。FR-LIF-001〜006とNFR-MNT-001を最小の新規境界で満たすためである。Alternative B/Cはrejectedとする。

### Reversibility

canonical portを保てば別native adapterへ置換できるため中程度。Pi private APIへ依存しないことをlock-in回避条件とする。

## ADR-002: Human presenceとcontinuationのnative event mapping

### Context

Piは`agent_end`後にもretry、compaction、queued continuationが走りうる。input eventには`interactive`、`rpc`、`extension`のsourceがある。RPCはtransportであってhuman provenanceではない。早期・重複continuationと偽HUMAN_TURNはgate安全性を破る。

### Decision

HUMAN_TURNはPiが`input.source = interactive`と証明したTUI inputだけから、session/turn/delivery identityで高々1回mintする。`rpc`と`extension` sourceはhuman presenceに数えない。`agent_end`は観測のみとし、Pi runが完全にsettleした`agent_settled`だけをcontinuation triggerにする。compaction後はactive intentとmissionをrecordから再解決する。

### Consequences

- no-input gateがadvanceせず、duplicate deliveryでもHUMAN_TURNとcontinuationは各1回以下になる。
- RPC clientはstatus、doctor、fixture/live negative journeyを実行できるが、初回正式保証ではhuman approvalをremote RPCだけで成立させられない。実human gateはTUIで行う。
- Pi eventの意味変更はversion付きfixtureとlive captureで検出する必要がある。
- settleが観測できないversionは無音縮退せず正式workflowをblockする。

### Alternatives Considered

- Option A — `agent_settled` + interactive-only presence: gate/presenceと完全settleを別々のauthoritative factで扱い、transportをhuman proofへ昇格させない。可逆性は中。
- Option B — `agent_end`で即continue: latencyは小さいがretry/compactionとのraceを作る。要件違反のため不採用。
- Option C — RPCを含む全inputをhuman扱い:単純だが自動RPC clientやextension自己入力でpresenceを偽装できる。security requirement違反のため不採用。

RecommendationはOption A。FR-LIF-003〜005、FR-GAT-001〜004に直接対応する。

### Reversibility

event mapping tableとfixtureを更新すれば変更可能だが、gate contractに影響するため中程度。変更は要件再承認を要する。

## ADR-003: RPC subprocessによる共通subagent driver

### Context

support、reviewer、Construction swarmはrole、parent-child identity、failure、cancel、timeoutを構造化して扱う必要がある。print-only CLI、RPC subprocess、in-process SDK sessionが候補になる。

### Decision

全roleを`pi --mode rpc --no-session`の独立child processで起動する共通driverを作る。RPC handshake、structured request/result、AbortSignal、deadline、shutdown、kill/reapを一つのcontractにまとめる。既存fixed-width poolがqueue、dependency、attempt、retryを所有する。

### Consequences

- child isolation、structured result、cancellation、terminal process factを同時に得られる。
- process spawn overheadとRPC protocol maintenanceが増える。
- provider/model設定はchild環境から継承するが、secretはauditへ渡さない。

### Alternatives Considered

- Option A — RPC subprocess: isolationと制御が最も明示的。可逆性は中。
- Option B — `pi -p` print subprocess:単純だがUI request/response、structured cancellation、role resultの信頼性が不足。可逆性は易。
- Option C — in-process SDK:高速だがsession/process isolation、global state、cancel/cleanup境界が曖昧。可逆性は低い。

RecommendationはOption A。FR-SUB-001〜005とNFR-SCL-001を既存poolへ接続しやすいためである。B/Cはrejectedとする。

### Reversibility

`PiChildRequest` / `PiChildResult`を安定させればSDK driverへの将来差替えは可能。ただし実行分離の意味が変わるため中程度。

## ADR-004: `.pi` harness layoutとstage discovery

### Context

Piはproject-local `.pi/skills`と`.pi/extensions`をdiscoverし、package metadataからrelative resource pathを宣言できる。Amadeus packagerは`HarnessManifest`とcanonical `stageEntry`を持つ。

### Decision

Pi harnessの`harnessDir`を`.pi`、stage runner rootを`.pi/skills`とし、`HarnessManifest.stageEntry`の既存runner形を使う。extensionは`.pi/extensions/amadeus-pi-extension.ts`、Amadeus skills/runnersは`.pi/skills/...`へ生成する。独自stage path推測は追加しない。

### Consequences

- Pi native discoveryと既存packager seamが一致する。
- setup後のproject treeがPiの慣習と揃う。
- `.pi`をharness identity、setup layout、doctor、docs、registryへ一貫登録する必要がある。

### Alternatives Considered

- Option A — `.pi` native layout + canonical stageEntry:既存契約を再利用。可逆性は易。
- Option B — Amadeus独自rootとloader:追加loaderとpath推測が必要でFR-HAR-003に反する。

RecommendationはOption A。Bは要件違反のためrejectedとする。

### Reversibility

manifest dataで表現されるため易。ただし既存導入projectのupdate migrationを伴う。

## ADR-005: setup payloadとPi Packageのdual-view projection

### Context

setup CLIは`dist/pi/`以下を対象project rootへコピーするため、そこへPi Package用`package.json`を置くと利用者のroot metadataと競合する。一方、Piのlocal/git package sourceはpackage rootのmetadataからskills/extensionsを解決する。両経路は同一candidate contentでなければならない。

### Decision

`dist/pi/`は`.pi/`を含むproject payload専用とし、Pi Package metadataを置かない。repository rootの既存`package.json`へPi resource manifestを生成・同期し、`dist/pi/.pi/extensions`と`dist/pi/.pi/skills`を参照させる。local installはrepository root path、git installはrepository root git sourceを使う。setupとPi Packageの実際のinstall結果をnormalized relative path + sha256で比較する。npm publishは行わない。

setup updateは`packages/setup`の`SetupTransactionCoordinator`が所有する。全action/conflictを事前計算し、target-local staging、元file backup、write-ahead journalを準備してからapplyする。各action前後をjournalへ同期し、全fileと新install manifestのatomic置換が完了した時点だけcommitする。failureは逆順rollbackし、process interruptionは次回起動時のmandatory recoveryで元状態へ戻るまで新しいinstall/upgradeを拒否する。

### Consequences

- setupが利用者`package.json`を上書きしない。
- local/gitが同じgenerated resourceを参照し、FR-DST-002〜004を満たす。
- git package install時にrepository rootのdependency install costが発生しうるため、文書とlive testで明示する。
- root metadata、dist projection、registryのdrift guardが必要になる。

### Alternatives Considered

- Option A — root package metadataから`dist/pi`を参照: setup安全性とlocal/git同一性を両立。可逆性は中。
- Option B — `dist/pi/package.json`: Pi package rootは単純だがsetupが利用者root packageを上書きしうる。data safety上不採用。
- Option C — 別`dist/pi-package/`: setupとpackageのresource複製が増え、同一candidate保証とgit subdirectory導入が複雑。可逆性は中。
- Option D — 新規workspace packageをnpm公開:公開credential/operationがscope外で、重い。

RecommendationはOption A。Bは安全性、Cは重複、Dはscope違反のためrejectedとする。

### Reversibility

将来Piがgit subdirectory packageを正式提供すれば専用package rootへ移せるため中程度。resource manifest contractとhash parityは維持する。

## ADR-006: RPC live journeyとTUI dogfoodの分離

### Context

正式完了にはPi実機green evidenceが必要であり、日常CIではprovider/auth不足による理由付きskipを許す。自動journeyはgate inputとauditを構造化してassertする必要がある。

### Decision

自動live journeyは`pi --mode rpc`を使い、skill discovery、lifecycle、read-only status/doctor、`agent_settled` continuation、および自動RPC回答ではHUMAN_TURN=0・GATE_APPROVED=0となるcanonical audit chainをassertする。macOS/Linux TUI dogfoodは別checklistで表示・trust・actual human answerによるHUMAN_TURN=1とgate承認を確認する。`pi -p`は必要ならread-only smokeに使うが正式gate journeyの正本にしない。

### Consequences

- 自動判定が安定し、RPC transportをhuman proofへ誤昇格させず、manual TUIのactual human gate/UX確認と責務が分かれる。
- formal completion evidenceにはPi version、OS、provider識別子、commit、assertion greenを保存する必要がある。
- opt-in未設定のCI skipは正式完了を意味しない。

### Alternatives Considered

- Option A — RPC automated + TUI manual:構造化assertと実UXを両立。可逆性は易。
- Option B — print-only automated:起動smokeは簡単だがgate/UI subprotocolとstructured audit assertionが弱い。
- Option C — TUIだけ:人間依存で再現性が低い。

RecommendationはOption A。B/Cは補助検証に限定する。

### Reversibility

live driverを差し替えてもfixture contractとevidence schemaを維持できるため易。

## ADR-007: Cloud、daemon、databaseを導入しない

### Context

対象repositoryはBun-onlyの短命CLI monorepoで、requirementsはcloud deployment、常駐service、databaseを明示的に対象外としている。Pi対応はlocal harness integrationである。

### Decision

AWS resource、daemon、network service、database、remote queueを追加しない。child concurrencyは既存local process pool、状態は既存record/audit filesystemで扱う。

### Consequences

- deployment/cost/availability topologyを増やさず、既存運用モデルを維持する。
- remote distributed executionは今回提供しない。
- AWS Platform観点の追加service mapping、IAM、VPC、IaCはN/Aである。

### Alternatives Considered

- Option A — local short-lived execution:既存制約と一致。可逆性は低いコストで維持。
- Option B — remote worker/service:水平拡張余地はあるがscope、security、operations負担を大きく拡張する。

RecommendationはOption A。Bは対象外のためrejectedとする。

### Reversibility

将来要件が変われば別intentでremote driver portを追加できる。ただし現時点では導入しない決定を強く固定する。

## ADR-008: Discovered manifest setをharness registryの正本とする

### Context

harness一覧はpackager、projection、setup、core identity、swarm、doctor、docsへ分散し、Pi registrationの取りこぼしを起こしうる。一方、`scripts/package.ts`は`packages/framework/harness/*/manifest.ts`を既にschema検証付きで自動発見する。

### Decision

schema-validなauthored harness manifestのdiscovery結果を唯一のmachine-readable Harness ID正本とする。projection、setup、core identity、swarm、doctor、generated documentation inventoryはconsumer registryと定義し、parity testが正本集合と各consumerを双方向比較する。実runtimeで別packageに閉じるconsumerは正本を直接importせず、生成時/parity testで同期を強制する。

### Consequences

- 新harnessはmanifest追加でcatalogへ入り、未登録consumerがdriftとして検出される。
- packages間の不適切なruntime importを増やさずにclosed registryを検証できる。
- manifestを追加する途中PRは全consumerを同一変更で更新しなければgreenにならない。

### Alternatives Considered

- Option A — manifest discoveryを正本:既存open discoveryを再利用し、重複catalogを増やさない。可逆性は中。
- Option B — 新しい固定配列catalog:consumer生成は容易だがmanifestとcatalogの二重正本を作る。
- Option C — 各registryを独立維持:現状の取りこぼしriskを残しFR-DST-005を満たさない。

RecommendationはOption A。B/Cはrejectedとする。

### Reversibility

将来共通packageへcatalogを移す場合もHarness ID集合とparity contractを保てるため中程度。

## 承認ゲートで確認する比較案

本ステージでは、Issue・requirements・CodeKB間に矛盾または実装を阻む欠落はなかったため追加質問を行っていない。上記ADRのRecommendationを設計案として提示し、承認ゲートのApproveをもってteam choiceとする。Request Changesの場合は対象ADR、代替案、影響するFR/NFRを明示して改訂する。
