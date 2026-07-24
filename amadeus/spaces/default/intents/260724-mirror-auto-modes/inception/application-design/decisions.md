# Architecture Decisions

> 上流入力（consumes 全数）: `requirements.md`、`architecture.md`、`component-inventory.md`、`team-practices.md`

## ADR-1: Mirror policyを独立したpure moduleに置く

### Context

`requirements.md`はmode、operation、boundary、event再入、completion chainの決定表を要求する。現行判断は巨大な`amadeus-orchestrate.ts`にあり、syncだけを特別扱いしている。

### Options

- **A — 独立`amadeus-mirror-policy.ts`:** 決定表をI/Oなしで集中テストできる。新規fileが1つ増えるが可逆性は高い。
- **B — orchestrator内の関数を拡張:** file追加はないが、lifecycle seamとpolicyが混在し、create／sync／closeの差が分岐へ散る。

### Decision

Option Aを推奨し、本設計の選択案とする。共有型は依存の葉となるC0 `amadeus-mirror-types.ts`へ置き、C2はC0だけに依存してorchestratorをimportしない。新規runtime moduleはC0とC2に限定する。

### Consequences

- 三モード完全行列とevent再入をunit testで高速検証できる。
- C7にはboundary変換とexecutor呼出しだけが残る。
- 新moduleを6ハーネスへ配布するmanifest同期が必要になる。

### Security and compliance

`auto`の同意範囲をMirror operation unionへ閉じ、PR mergeやreleaseへの誤拡張を型で防ぐ。

### Alternatives Rejected

Option Bは変更行数が一時的に少なくても、巨大module内で安全規則が分散するため棄却する。

### Reversibility

高い。pure functionは将来orchestrator内へ戻せるが、公開CLI contractには影響しない。

## ADR-2: Mirror永続状態を`amadeus-state.md`のversioned fieldsに集約する

### Context

provenance、operation receipts、warningsをIntent recordが所有し、Gitで共有する必要がある。

### Options

- **A — state内のversioned JSON fields:** 既存state owner、atomic write、status／resumeと同じsourceを再利用できる。
- **B — `mirror-state.json` sidecar:** schemaは明瞭だが、新しいlock／atomicity／selector／配布契約が増える。
- **C — auditだけから再構成:** append-onlyだが、statusとrecoveryの毎回replayが必要で、部分成功時のcurrent stateが不明瞭。

### Decision

Option Aを選ぶ。既存のstate lockを保持したまま最新の`amadeus-state.md`全体を再読込し、Mirror専用revisionをcompare-and-swapする。`Mirror Provenance`、`Mirror Operation Receipts`、`Mirror Warnings`を一つのatomic transitionで更新し、Mirror以外のfieldとbyte列を保存する。remote成功後はprovenanceと`succeeded` receiptを同じatomic transitionで確定する。既存`Mirror Issue`は表示互換ではなく正規fieldとしてprovenanceと一致検証する。

### Consequences

- state parser／template／migration testsが増える。
- current Mirror stateを一度のreadで得られる。
- JSON fieldはunknown schema、duplicate、invalid statusをfail-closedで拒否する必要がある。

### Security and compliance

credentialを保存せず、repository／Intent／Issue identityと非機密failure summaryだけを保存する。

### Alternatives Rejected

Option Bは今回不要な第二のstate storeを作る。Option Cはidempotent recoveryに必要な即時状態を得にくい。

### Reversibility

中。state schemaはversioned migrationが必要になるため、設計後の変更コストはpure policyより高い。

## ADR-3: local provenanceとIssue markerを相互検証する

### Context

Issue番号だけではAmadeus作成を証明できず、外部Issueの誤edit／closeにつながる。

### Decision

create前に確定できる`MirrorCreateIdentity`（schema、Intent UUID、record directory、repository、create operation identity。Issue番号を含まない）を定義し、Issue本文のversioned HTML comment markerへ埋め込む。remote create後はIssue番号とtimestampを加えた`MirrorProvenance`を保存する。sync／close前にlocal provenanceとremote markerを相互検証する。

### Consequences

- 利用者がmarkerを改変すると自動mutationは安全停止する。
- markerはIssue本文に表示されないが、秘密情報を含めない。
- manual relink／repair pathが必要になる。

### Security and compliance

repository違いと外部Issueをfail-closedで拒否する。token、credential、local絶対pathはmarkerへ含めない。

### Alternatives Rejected

- labelだけ: 利用者が付与でき、Intent identityを証明しない。
- titleだけ: 可変で衝突しやすい。
- Issue番号だけ: ownership証明がない現状を維持する。

### Reversibility

中。marker schemaはversionedにし、readerは明示migrationなしに未知versionを受理しない。

## ADR-4: remote call前receiptと保守的な候補再発見を採用する

### Context

remote create成功後のlocal write失敗で重複Issueが生じ得る。network failureではremote outcomeが不明な場合もある。

### Decision

create前にoperation identityと`prepared`を永続化し、remote call直前に`attempted`へ遷移する。再入時はmarker候補を検索し、1件だけ整合すれば採用する。`attempted`以後で0件、または2件以上は新規createせず`safety-blocked`とする。

### Consequences

- false duplicateより手動修復を優先する。
- marker削除時は自動回復できない。
- failure injection testsが必要になる。

### Security and compliance

曖昧な外部状態へ追加mutationしないため、誤Issue増殖とownership混同を抑える。

### Alternatives Rejected

- 0件なら常にcreate: remote outcome不明時に重複する。
- 最新Issueを自動採用: unrelated Issueを採用し得る。
- GitHubをtransactional storeとみなす: local stateとの原子transactionは提供されない。

### Reversibility

中。将来GitHubがidempotency keyを提供すればgateway内部で置換でき、policy contractは維持できる。

## ADR-5: Mirror failureをtyped outcomeとしてworkflow routingから分離する

### Context

Mirrorは共有面として重要だが、GitHub一時障害でAI-DLC成果物生成を止めるべきではない。

### Decision

C6は`completed | pending | safety-blocked`を返し、C7はwarningを永続化して`workflowMayAdvance: true`をengineへ返す。remote call前に`attempted` receiptを必ず永続化し、そのwriteが失敗した場合はremote callを実行しない。remote成功後の完了writeが失敗しても、未解決の`attempted` receipt自体をwarning／reconciliation sourceとして扱う。config invalidとprovenance／landing違反もmutationを抑止し、Mirror側の修復待ちとしてworkflowを継続する。

### Consequences

- stage／phaseはGitHubの可用性から独立する。
- warningとpendingをstatusで見落とさない設計が必要になる。
- completion後のclose failureはIssueをopenのまま残す。

### Security and compliance

非阻害は安全guardの緩和を意味しない。`safety-blocked`は`auto`でも強行できない。

### Alternatives Rejected

- 全failureでengine停止: optional GitHub substrateが本体availabilityを支配する。
- failureをログだけにして継続: 未同期が不可視になる。
- silent retry loop: rate limitと背景外部操作を増やす。

### Reversibility

高。Outcomeの特定分類だけを将来blockingへ変更できる。

## ADR-6: 新しいservice／AWS／UIを導入しない

### Context

対象はlocal CLI frameworkとGitHub Issueであり、常駐処理や高スループット要件はない。

### Decision

既存Bun process内の同期orchestrationと`gh` child processを維持する。retryはlifecycle boundaryまたはmanual commandで行う。AWS resource、queue、database、webhook、poller、web UIを追加しない。

### Consequences

- 運用コストとcredential surfaceを増やさない。
- GitHub eventで即時回復せず、次boundaryまでpendingが残り得る。
- CLI warningの情報設計が重要になる。

### Security and compliance

新しいnetwork endpoint、IAM、secret storeを作らない。`gh` credential store以外へtokenを複製しない。

### Alternatives Rejected

- webhook／daemon: lifecycle event数に対して過剰。
- queue worker: 新しい配備・監視・credentialが必要。
- GitHub App専用実装: 現行optional `gh`契約を不要に置換する。

### Reversibility

高。将来必要ならC5 Gatewayの後ろに別transportを実装できるが、今回generic portは先行導入しない。

## ADR-7: project／space解決を既存resolverへ統一する

### Context

固定4階層上の`projectDirFromToolsDir()`はsource layoutでは動くが、`.codex/tools`等のself-install layoutで誤rootを返す。

### Decision

`amadeus-lib.ts`の既存`resolveProjectDir()`とspace／Intent selectorをMirror CLIでも使用する。Issue bodyのrecord pathはactive spaceから構成し、`default`を固定しない。

### Consequences

- sourceと6 self-install layoutで同じroot contractを使える。
- Mirror固有のpath計算を削除できる。
- distribution layout integration testを追加する。

### Security and compliance

誤workspaceのstate／Issue番号を読んで外部mutationする危険を減らす。

### Alternatives Rejected

- layoutごとの`..`数分岐: 新harness追加で再発する。
- cwdのみ: 任意directoryからCLIを実行できない。
- `--project-dir`必須化: 既存利用者体験を壊す。

### Reversibility

高。既存resolverの公開contractを再利用するだけである。

## ADR-8: 全GitHub gateway callへrepository identityを明示する

### Context

current directoryや`gh`の暗黙repository解決に依存すると、fork／複数remote／self-install layoutで別repositoryのIssueをmutationし得る。

### Decision

create、get、search、sync、closeの全gateway methodへ`RepositoryIdentity`を必須引数として渡し、`gh api` invocationでは必ず`repos/{owner}/{name}/issues...`をrequest pathへ埋め込む。remote responseにもrepository identityを含め、local provenanceとの一致を検証する。

### Consequences

- gateway contractは冗長になるが、repository bindingがcall siteから監査できる。
- repository未解決時はremote mutation前にtyped failureとなる。
- test doubleはrepository引数を検証する。

### Security and compliance

暗黙contextによるcross-repository mutationをfail-closedで防ぐ。

### Alternatives Rejected

- process cwdへ依存: harness layoutと実行位置で意味が変わる。
- gateway constructorだけで固定: call単位の監査証跡が弱く、誤instance再利用を検出しにくい。

### Reversibility

高。transportを変更してもexplicit repository contractは維持できる。

## ADR-9: `safety-blocked`の修復は常にhuman-gated CLIに限定する

### Context

候補0件／複数件、marker不一致、repository不一致は自動判断で安全に解消できない。

### Decision

`repair status`、`repair relink`、`repair abandon`を提供し、mutationを伴うrepairはmodeが`auto`でも必ず人間の確認を要求する。通常のboundary driverは`safety-blocked`を強行せず、warningを保持する。

### Consequences

- operatorは原因を確認して明示的に復旧できる。
- repair後は次のdistinct lifecycle eventまたはmanual retryで通常chainへ戻る。
- backgroundでownershipを書き換える経路を作らない。

### Security and compliance

standing consentである`auto`をownership修復へ拡張せず、外部Issueの誤採用／誤closeを防ぐ。

### Alternatives Rejected

- 最新候補を自動採用: unrelated Issueを採用し得る。
- `auto`でmarkerを再生成: provenance改ざんを正常状態として上書きし得る。

### Reversibility

高。repair commandはruntime policyから分離され、将来UIを追加しても同じhuman gateを再利用できる。

## ADR-10: runtime ownershipと6ハーネス配布ownershipを分離する

### Context

runtime implementationだけを更新すると、self-installされたClaude Code、Codex CLI、Cursor、Kiro CLI、Kiro IDE、OpenCodeの配布物がdriftする。

### Decision

C0〜C8をruntime ownership、C9 Distribution Synchronizerをbuild-time ownershipとする。正準6ハーネスはdist directory名で`claude | codex | cursor | kiro | kiro-ide | opencode`と定義する。C9はcanonical source、manifest／installer、6ハーネスの配置、日英document、generated drift guardを同期し、runtimeからimportされない。

### Consequences

- runtime dependency graphへ配布都合を混入しない。
- manifest／self-install integration testで全ハーネスの欠落を検知できる。
- module追加時はC9の同期対象更新が必須になる。

### Security and compliance

全ハーネスへ同じprovenance guardとrepository bindingを配布し、実行面ごとの安全性差を防ぐ。

### Alternatives Rejected

- 各ハーネスを手動更新: driftと取りこぼしを検知できない。
- runtimeが配布処理を持つ:利用時に自身のinstallationを変更する不要な権限を生む。

### Reversibility

高。distribution toolchainを変更してもC0〜C8のruntime contractには影響しない。

## Gateで選択する設計

本成果物はADR-1のOption A、ADR-2のOption A、ADR-3〜10のDecisionを一組の推奨設計として提示する。すべて`requirements.md`の安全性・非阻害性・surgical changeへtraceし、代替案も各ADRへ記録済みである。未解決のarchitecture questionはない。
