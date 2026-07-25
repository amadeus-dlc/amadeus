# Units of Work

> 上流入力（consumes 全数）: `components.md`、`component-methods.md`、`services.md`、`component-dependency.md`、`decisions.md`、`requirements.md`

## 分解方針

`components.md`のC0〜C9、`component-methods.md`の公開contract、`services.md`のoperation flow、`component-dependency.md`の一方向依存、`decisions.md`のADR-1〜10、`requirements.md`のFR-1〜10／NFR-1〜5を、変更責務と安全契約で5 Unitへ分解する。各Unitは単一Amadeus frameworkへembeddedされ、独立serviceや独立packageとしてdeployしない。

Unitは単独でcontract testまたはintegration testを実行でき、隣接Unitの内部実装をimportしない。Unit間で共有する型は`mirror-contract-policy`が所有するC0だけを経由する。経済的な実装順序とcritical pathはDelivery Planningで決定する。

## Unit 1: `mirror-contract-policy`

### 説明と境界

C0 Mirror Types、C1 Mirror Config Resolver、C2 Mirror Policyを所有する。C1だけが既存selectorを通じたread-only config filesystem I/Oを持ち、schema／precedenceとC2 decisionはpure functionへ分離する。三モードとoperation／boundary決定表を実行可能なcontractへ固定する。

### 責務と成果物

- `amadeus-mirror-types.ts`に共有DTO、判別union、Gateway interface、repair challengeを定義する。
- `amadeus-mirror-config.ts`で`off | prompt | auto`を厳密解決し、未指定を`prompt`、booleanをinvalidとする。
- `amadeus-mirror-policy.ts`でcreate／sync／close、event再入、skip、pending、completion chainをpure decisionとして実装する。
- mode × operation × boundary、設定三層、invalid schemaのunit testsを同じUnitで提供する。

### 配置・規模・制約

- **Deployment model:** shared／embedded
- **Relative complexity:** M
- C0／C2はI/Oなし。C1はconfig readだけを行い、filesystem write、`gh`、state write、lifecycle advanceを行わない。
- generic external actionへ拡張せず、PR／release／deployを型で表現しない。

## Unit 2: `mirror-state-provenance`

### 説明と境界

C3 Mirror State StoreとC4 Mirror Provenance Verifierを所有し、Intent recordとIssue markerのidentityを安全に結ぶ。

### 責務と成果物

- Mirror revision、receipt、provenance、warning、repair challengeのcodecとinvariantを実装する。
- 既存state lock内で最新`amadeus-state.md`全体を再読込し、非Mirror bytesを保持してatomic writeする。
- `prepare`でreceiptとcreate identityを同時確定し、`complete`でprovenanceと`succeeded`を同時確定する。
- marker parse／ownership verify／0・1・複数候補分類をfail-closedで実装する。
- repair challengeをIntent、repository、operation、plan digestへbindし、一度限りで消費する。
- state CAS、partial write、marker mismatch、repair replayのfailure-injection testsを提供する。

### 配置・規模・制約

- **Deployment model:** shared／embedded
- **Relative complexity:** L
- GitHub mutationとlifecycle advanceを行わない。
- candidateが曖昧な場合は採用・作成・edit・closeを行わない。

## Unit 3: `mirror-github-gateway`

### 説明と境界

C5 Mirror GitHub Gatewayだけを所有し、明示repositoryへ安全なremote requestを行うprocess境界を提供する。

### 責務と成果物

- すべての`gh api`呼出しで`repos/{owner}/{name}/issues...`をrequest pathへ埋め込み、argument arrayで起動する。
- readiness、create、search、view、edit、closeのresponseを検証してtyped outcomeへ正規化する。
- executable／auth／permission／network／API failureを秘密情報なしのGateway outcomeへ変換する。
- fake GitHub runnerによるargument、明示repository、response shape、failure normalization testsを提供する。

### 配置・規模・制約

- **Deployment model:** shared／embedded
- **Relative complexity:** M
- mode、state、provenance、stage routingを判断せず、C0 Gateway contractだけを実装する。
- credential、raw stderr、tokenをstate／audit／出力へ保存しない。

## Unit 4: `mirror-operation-lifecycle`

### 説明と境界

C6 Mirror Operation Executor、C7 Mirror Lifecycle Coordinator、C8のruntime rendererを所有し、state／provenanceとGatewayを結合してengine boundaryから安全にoperationを実行する。

### 責務と成果物

- `prepare → readiness → attempted → remote → complete`の順序を守り、readiness失敗またはremote前write失敗ではremote callを禁止する。
- create後local failureをmarker候補へreconcileし、重複Issueを作らない。
- sync／close前のprovenance、repository、landing、final-sync guardを順序どおり適用する。
- Intent Capture承認、phase verification、park、workflow completionの永続boundary instanceを接続する。
- `auto`の最大3操作chain、`prompt`のoperation別質問、`off`の完全抑止を実装する。
- prompt回答をevent／operationへbindし、同一event skipの再質問を防ぐ。
- GitHub failureでも`workflowMayAdvance: true`を維持し、warningとpendingを表示する。
- C1 resolved mode／sources、C3 state、C4 provenance verificationを専用status contextへ集約し、runtime status、prompt、Issue本文、repair prompt、secret redactionを実装する。skill、Guide、Referenceは所有しない。
- remote/local failure injection、lifecycle再入、completion chain、park、manual CLI、non-default spaceのintegration testsを提供する。

### 配置・規模・制約

- **Deployment model:** shared／embedded
- **Relative complexity:** XL
- engine routingを置換せず、Mirror failureでstage／phaseを恒久停止しない。
- `auto`のstanding consentをMirror operation以外へ拡張しない。

## Unit 5: `mirror-distribution-docs`

### 説明と境界

C9 Distribution Synchronizer、`amadeus-mirror` skill、Guide／Reference日英文書を所有し、完成runtime contractを6ハーネスと利用者文書へ同じ意味で投影する。C8のruntime rendererは所有しない。

### 責務と成果物

- core tools／skill、必要なharness manifest／emit、package／promote対象を同期する。
- 正準6面`claude | codex | cursor | kiro | kiro-ide | opencode`へ同じbytesとcontractを生成する。
- Guide／Referenceの日英ペアへ三モード、既定`prompt`、boolean拒否、boundary、retry、safe closeを記載する。
- `amadeus-mirror` skillとCLI help／status文言を同期する。
- distribution layout root、tool／skill存在、docs parity、`dist:check`、`promote:self:check`を検証する。

### 配置・規模・制約

- **Deployment model:** generated distribution／embedded
- **Relative complexity:** M
- `dist/`とself-install面を独立正本として手編集しない。
- harness固有差が不要なcore toolへoverlayを作らない。

## Unit完了条件

各Unitは、所有範囲の実装、同範囲のtests、公開contractとの整合、関連要件へのtraceを同時に満たす。隣接Unitの未完成内部実装に依存する場合はC0 contractに対するtest doubleを使い、内部symbolを暫定共有しない。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-24T04:27:58Z
- **Iteration:** 1
- **Scope decision:** none

Unit 3の必須依存欠落とNFR-5のacceptance slice欠落により、DAGと要件被覆が実装可能な状態へ収束していない。

### Findings

- Blocker — Unit 3からUnit 2への直接依存が欠落。mirror-github-executionが所有するC6 ExecutorはC3 State StoreとC4 Provenance Verifierへ直接依存するため、YAML、prose、component dependencyが不一致である。Unit 3へUnit 2依存を追加するかC5とC6を分割する必要がある。
- Blocker — NFR-5がrequirements-based acceptance sliceに存在しない。daemon／polling禁止、boundary限定通信、read-only statusの非mutationを検証可能な利用者価値と受け入れ条件へ落とす必要がある。
- Major — C8/C9の成果物owner境界が重複。Unit 4をruntime rendererに限定し、Unit 5をskill／Guide／Reference／distribution projectionのownerとする必要がある。
- YAML blockは構文上cycle-freeだが、意味的な依存欠落がある。
- 経済的な実装順序やcritical pathは提示されておらず、Stage 2.8の判断を代行していない。
- Gate Rejection Revisionで確定したC0型owner、prepare identity、typed failure、repair challenge、正準6ハーネスは概ね反映済み。

## Review Iteration 1 Remediation

| Finding | Resolution |
|---|---|
| C6のC3／C4依存欠落 | Unit 3をC5 Gateway専用`mirror-github-gateway`とし、C6をUnit 4 `mirror-operation-lifecycle`へ移動。Unit 4はstate UnitとGateway Unitの両方へ直接依存 |
| NFR-5 slice欠落 | AS-08を追加し、背景processなし、eligible boundary／manual CLI限定通信、read-only status非mutationをtestへ割当 |
| C8／C9 owner重複 | Unit 4はruntime renderer、Unit 5はskill／Guide／Reference／distribution projectionを最終所有 |

## Review — Iteration 2

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-24T04:33:03Z
- **Iteration:** 2
- **Scope decision:** none

Iteration 1のDAG・AS-08・Unit内owner分離は修正されたが、C8のstatus contractと上流owner定義に実装を一意化できない矛盾が残る。

### Findings

- Blocker — Unit 4が所有するC8 runtime statusはFR-8によりresolved mode表示が必須だが、renderMirrorStatus(state: MirrorStateSnapshot)の入力にはmodeが存在せず、MirrorStateSnapshotにもmode fieldがない。modeを引数または専用presentation contextへ追加する必要がある。
- Major — Unit成果物ではUnit 4をruntime renderer、Unit 5をskill／Guide／Reference／distribution projectionへ分離している一方、components.mdのC8は日英文書を責務に含め、配置表でもskill／Guide／ReferenceをC8へ割り当てている。C9およびADR-10とのowner定義を統一する必要がある。
- 解消済み — C5 Gateway、C6〜C8 runtime、state-provenanceの依存と並行性はcomponent DAGと整合する。
- 解消済み — AS-08はNFR-5を検証可能なsliceへ落としている。
- YAML、Unit定義、Story MapのUnit名は一致し、DAGはcycle-freeである。
- FR-1〜10、NFR-1〜5はすべてacceptance sliceとUnitへ割り当てられている。
- Delivery Planningの経済的判断へ越境していない。

## Review Iteration 2 Remediation

| Finding | Resolution |
|---|---|
| statusにresolved modeが渡らない | C0へ`MirrorStatusContext`を追加し、C1 mode／sources、C3 state、C4 provenance statusをC8へ明示入力する。modeはstateへ複製しない |
| 上流C8／C9 owner重複 | Application Designを修正し、C8はruntime rendererだけ、C9はskill／Guide／Reference／distribution projectionの最終ownerとした |
