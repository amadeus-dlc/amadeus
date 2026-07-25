# Business Logic Model — mirror-operation-lifecycle

> 上流入力（consumes 全数）: `unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md`

## Functional Boundary

`unit-of-work.md`のUnit 4、`unit-of-work-story-map.md`のAS-02〜06／08、`requirements.md`のFR-1〜8／10とNFR-5、`components.md`のC6〜C8、`component-methods.md`のExecutor／Coordinator／Presentation contract、`services.md`のboundary orchestrationを実装する。

本UnitはC1〜C5を組み合わせてMirror operationを実行し、engineへ必ず非阻害outcomeを返す。state codec、marker codec、GitHub transport、配布文書を再実装しない。

## Boundary Evaluation

`driveMirrorBoundary`は次の順序で1 boundaryを評価する。

1. engineからIntent UUID、Intent directory、canonical repository、永続boundary instanceを受け取る。
2. C1でmodeをresolveする。invalidならC3の`set-global-warning`でreceipt非依存configuration warningをbest-effort保存し、GitHub／operation receiptなしで`continued`を返す。validへ戻った場合はconfiguration warningだけをclearする。
3. C3で最新snapshotを読む。invalidなら`safety-blocked` warning付き`continued`を返す。
4. C2でboundaryに適用可能な単一operationとevent identityを決める。
5. suppressならmutationなしで`continued`を返す。
6. promptならexpected event／operationをC3の`set-expected-prompt`で永続化してから`ask`を返す。
7. executeならC6へ1 operationを渡す。
8. workflow completionだけはsuccess時にstateを再読込して同じboundaryの次operationを再評価する。Intent Capture／phase／park／manualは最初のoperation resultでterminalにする。

`off`はpendingより先に評価し、既存warning／receiptを保持したまま全operationを抑止する。manual CLIはmodeを参照しないが、安全guardを一切省略しない。

## Prompt and Answer Flow

promptはcreate／sync／closeの対象、Intent、repository、Issue number、skipの効果を表示する。回答は保存済みexpected event／operationと完全一致する場合だけ受理する。

- `choice`がevent operationと違う、boundary instanceが違う、expected promptがない場合はmutationなしで拒否する。
- answer受理時はC3のexpected promptを再読込して一致検証する。approveは`approve-prompt-and-prepare`でexpected prompt消費とapproval-bearing prepared receipt作成を同じState Store transactionへまとめる。skipはexpected prompt消費と`skip-for-event`を同じtransactionへまとめ、event、operation ID候補、preparedAt、completedAtからreceipt absentでもterminal receiptを作る。
- skipはfailure／attemptに数えず、既存warningを消さない。
- approve後は通常の`decideMirrorAction`を再呼出しせず、C2の`approveMirrorPrompt`へ永続expected prompt、answer、最新stateを渡す。C2はevent／operation／retryOfとapplicability／terminal stateを再検証し、明示的なexecuteまたはsuppressだけを返す。
- create／final sync成功後は同じcompletion boundaryで次のpromptを返す。前段skip／failure／blocked／abandonedでは後段を返さない。

## Create Execution

1. C3へprepare候補を渡し、成功したwrite結果からreceipt／create identityを得る。
2. 永続identityのIntent UUID、Intent directory、repositoryをcurrent contextと照合する。不一致はremote command 0件でsafety-blocked。
3. markerを永続identityから描画する。
4. C5 readinessを実行する。失敗時はpreparedを維持し、not-started warningをbest-effort保存する。
5. marker候補を全page検索し、C4で現在receipt statusとeffectを含めて分類する。検索中はpreparedのまま維持する。
6. adoptならremote DTOからprovenanceを作りcompleteする。
7. fresh prepared＋候補0件なら`claim-create-attempt`をCAS保存する。このwriteを成功させたcallerだけがcreate permitを得る。
8. pending＋no-effect-confirmed＋候補0件なら`retry-after-no-effect`をCAS保存する。このwriteを成功させたcallerだけがretry permitを得る。
9. attempted／outcome-unknownで候補0件、候補複数、mismatch、claim conflictは新規createせずsafety-blockedにする。
10. C6内部factoryでcreate permitを発行し、markerと注入済み`issueContent`でcreateする。
11. remote success後、provenance／Issue number／succeededを単一complete writeへ保存する。

Gateway failureはeffectで分岐する。

| Effect | Persisted state | Next boundary |
|---|---|---|
| not-started | prepared＋warning | 同operationをreadinessからretry |
| no-effect-confirmed | pending＋effect | 候補0件確認後、retry transitionを経て同identityでretry |
| outcome-unknown | pending＋effect | 候補1件だけadopt、0／複数はsafety-blocked |

remote success後のcomplete write失敗ではattempted receiptが残るため、次回は必ず候補reconciliationを先に行い、新規createへ直接戻らない。

## Sync Execution

1. local provenanceとIssue numberの存在を検証する。
2. C5 viewでremote snapshotを取得する。
3. C4でrepository、marker identity、Issue numberをverifyする。
4. workflow completion以外ではlanding checkを行わない。completion final syncではregistry=`complete`かつstate Status=`Completed`を検証する。
5. receiptをprepareし、readiness、attemptedの順に永続化する。
6. C7がC8でcurrent Intent snapshotから描画した`issueContent`をC6 contextへ注入する。
7. C6だけがsync permitを発行し、注入済みbodyでeditする。
8. response identityを再検証しcompleteする。

GitHub Issue本文をIntent recordへ逆流させない。同一snapshotの再syncは同じbodyへ収束し、commentや別Issueを作らない。attempted／outcome-unknownへ再入した場合はview結果のbodyが`issueContent.body`と完全一致ならremote成功済みとしてcompleteする。不一致ならownership再検証後に`claim-observed-retry(observation=sync-body-differs)`をCAS保存し、winnerだけが同じbodyを再PATCHする。

## Close Execution

closeは次のguardを順番どおり全て通過した場合だけ実行する。

1. local provenanceあり。
2. remote marker／Intent／repository／Issue number一致。
3. registry status=`complete`。
4. state Status=`Completed`。
5. 同じworkflow completion instanceのfinal sync receipt=`succeeded`。
6. receipt prepare、readiness、attemptedが成功。

その後だけclose permitを発行する。manual closeも1〜5を緩和しない。attempted／outcome-unknownへ再入してremote viewがclosedなら収束成功としてcompleteする。openならownership／landing／final-sync guardを再検証後に`claim-observed-retry(observation=issue-still-open)`をCAS保存し、winnerだけが同じIssueへcloseを再適用する。

## Completion Chain

同じworkflow completion instanceで最大3 operationだけを直列化する。

| Current result | Next |
|---|---|
| Issueなし | create |
| create succeeded | final sync |
| final sync succeeded | close |
| close succeeded | terminal |
| skip／pending／safety-blocked／abandoned | terminal |

`auto`はsuccess後だけloopし、最大3回で停止する。`prompt`は各operationを別askにする。`off`は0回で本体workflowだけ完了させる。

## Cross-boundary Retry Identity

別boundary instanceへ到達した評価自体は新しい`triggerEvent`を生成する。ただし未完了receiptがある場合は新operation receiptを作らず、最古のeligible pending receiptを先に選び、そのreceiptの元event／operation IDを`retryOf`としてC6の`event`へ継承する。`MirrorExecutionContext.triggerEvent`は現在boundary event、`event`はremote attemptを所有する元eventであり、fresh executionでは両者が同じである。

| Pending operation | Reconciliation | Result |
|---|---|---|
| create | marker候補検索 | 1件adopt、no-effect-confirmed 0件だけretry、それ以外block |
| sync | remote view body比較 | 同一ならcomplete、不一致ならverified Issueへ同じbodyを再適用 |
| close | remote view state比較 | closedならcomplete、openなら全guard再検証後にclose再適用 |

旧pendingがcompleted／blocked／abandonedになるまでcurrent trigger eventの新operationを開始しない。

## Failure Mapping and Workflow Continuation

全Mirror結果は`continued(..., workflowMayAdvance=true)`へ包む。Mirror failureからengine stage／phase transitionをrollback、throw、永久blockしない。

- configuration／state parse／provenance／landingはfail-closedでmutation 0件。
- GitHub一時障害はpending warning。
- CAS conflictは最新stateを再読込して同eventを1回再評価し、それでもconflictならpendingとして返す。busy loopしない。
- remote前local write failureはremote call 0件。
- remote後local write failureの即時outcomeは`safety-blocked`とし、attempted receiptをreconciliation sourceとして残す。次boundaryでremote evidenceにより収束できた場合だけcompletedへ進める。
- warning clearは同operation successだけに限定する。

## Audit Contract

新しいaudit event typeは追加しない。C3のtool-owned state mutationが既存`ARTIFACT_UPDATED`を発生させ、そのContextへtransition kind、trigger event key、operation event key、operation ID、classificationを記録する。

| Lifecycle fact | State transition / existing audit evidence |
|---|---|
| operation開始 | `claim-create-attempt`または`mark-attempted`の`ARTIFACT_UPDATED` |
| success | `complete`の`ARTIFACT_UPDATED` |
| failure | `set-warning`／`mark-pending`／`mark-safety-blocked`の`ARTIFACT_UPDATED`、tool exit時は`ERROR_LOGGED` |
| skip | `skip-for-event`の`ARTIFACT_UPDATED` |
| reconciliation | retry／adopt／complete transitionのContextに`reconciliation=true` |

state write成功より先にsuccess auditを出さず、remote outcome不明をsuccessとして記録しない。audit emitter failureでremote mutationを再実行せず、receiptを正本として次回に追跡可能性を回復する。

## Manual CLI and Repair

`create | sync | close | status [--intent]`は既存space／Intent selectorを使う。statusはread-onlyでGitHub mutation 0件である。

repair statusはstateとremote候補をread-only inspectionし、relink／abandon planを作る。relink provenanceの`createdAt`はinspection時の注入clockで生成し、plan／digestへfreezeする。apply前にC3へone-time challengeを保存する。C3がproof、10分期限、未消費、Intent、repository、operation、plan digest、exact phraseを同じlockで再検証し、repairとchallenge消費を1 writeで行う。成功時は`repaired(relink|abandon, issueNumber|null)`を返す。marker欠落Issueは自動relinkしない。

## Presentation

statusの出力順を固定する。

1. resolved modeとsource。
2. Issue number／repository。
3. provenance `unlinked | verified | unverified`。
4. current pending／safety-blocked operation。
5. warning classification、effect、occurredAt、retry可否。
6. 次アクション。

Issue bodyはIntent UUID、summary、phase、stage、status、updatedAt、markerを固定heading順で描画する。prompt／status／warningは色やemojiだけへ意味を依存せず、secretやraw diagnosticsを含めない。

## Integration Scenarios

- Intent Capture承認後、auto createが1件へ収束する。
- phase verification／park commit後、verified Issueだけをsyncする。
- completion promptはcreate、final sync、closeを別々に確認する。
- final sync failureではclose command 0件、Issue open、workflow completedとなる。
- same boundary resumeは同eventを再利用し、skipを再質問しない。
- non-default spaceとexplicit Intent selectorが正しいrecordを使う。
- background network、daemon、pollingは0件である。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-24T05:33:20Z
- **Iteration:** 1
- **Scope decision:** none

createの安全な初回実行を成立させる状態遷移、C6からC8への描画入力、境界間retryのidentity継承が未確定である。

### Findings

- Blocker — fresh createとreconciliationを判別できない。候補検索中はpreparedを維持し、create-new確定後のprepared → attemptedが今回のwriteで成功した実行だけにcreate permitを与えるなど、所有権を一意化する必要がある。
- Blocker — C6がC8のIssue本文を取得できる公開contractがない。C7がsnapshotを構築して描画済みcommandをC6へ渡すか、C6へC8 portとsnapshotを注入するかを公開call shapeと依存図で統一する必要がある。
- Major — phase／parkのcatch-up create後に余分なsyncが走るかが矛盾する。最大3段loopをworkflow completionだけに限定し、phase／parkでは最初の成功operationでterminalとする必要がある。
- Major — 境界をまたぐpending／outcome-unknown retryのevent identity選択とsync／closeの収束手順が欠落している。旧attemptのreconciliationを先に行う優先順位、operation identityの継承、新boundary eventとの関係を決定表にする必要がある。
- Major — post-remote local write失敗の結果分類が要件と不一致。create／sync／closeそれぞれについて即時結果とreconciliation後の遷移を上流要件へ合わせて統一する必要がある。
- Major — FR-6.7のaudit契約が成果物にない。C6／C7の各遷移に対応するaudit emission contractと検証シナリオが必要。

## Review Iteration 1 Remediation

- candidate検索中はpreparedを維持し、CAS `claim-create-attempt` winnerだけが初回create permitを得る契約へ変更した。
- C7がC8で`MirrorIssueContent`を生成し、C6 contextへ注入する公開call shapeを追加した。
- completion以外のboundaryは1 operationでterminalへ統一した。
- current trigger eventと旧operation event／IDを分離し、create／sync／closeのreconciliation表を追加した。
- post-remote complete write失敗の即時outcomeをsafety-blockedへ統一した。
- 新規event名を作らず、既存`ARTIFACT_UPDATED`／`ERROR_LOGGED`とreceipt transitionで開始・成功・失敗・skip・reconciliationを追跡する契約を追加した。

## Review — Iteration 2

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-24T05:40:31Z
- **Iteration:** 2
- **Scope decision:** none

Iteration 1のcreate排他、C8描画入力、completion限定loop、境界間identity分離は改善されたが、prompt承認後の実行、audit carrier、永続configuration warning、outcome-unknown再試行、repair完了結果に公開契約上の欠落がある。

### Findings

- Blocker — prompt承認後にpolicyを再評価して実行へ進むcall shapeがない。承認済みbindingを表すpolicy inputまたは明示的なapproved-execution decisionが必要。
- Blocker — audit契約をC3 transitionへ伝達できない。mutateMirrorStateAtomicとMirrorTransitionにcurrent trigger eventやreconciliation flagがない。
- Major — configuration errorの永続warningが上流要件と不一致。receipt非依存warning transitionが必要。
- Major — sync／closeのoutcome-unknown再適用に排他的な状態遷移がない。remote observationを根拠にCASで再試行権を取得する遷移が必要。
- Major — repair成功をMirrorOperationOutcomeで表現できない。abandon resultとrelink createdAt生成規則が必要。

## Review Iteration 2 Remediation

- `approveMirrorPrompt`を追加し、永続expected bindingと最新stateからapproved executionへ進むcall shapeを固定した。
- `MirrorAuditContext`を全C3 mutationの必須引数にし、trigger／operation eventとreconciliationを既存audit carrierへ渡せるようにした。
- receipt非依存`set-global-warning`／`clear-global-warning`でconfiguration warningを永続化した。
- remote observation後のCAS `claim-observed-retry`を追加し、sync／close再PATCHのwinnerを1件へ限定した。
- `repaired` outcomeと、inspection時clockでfreezeするrelink createdAtを追加した。
