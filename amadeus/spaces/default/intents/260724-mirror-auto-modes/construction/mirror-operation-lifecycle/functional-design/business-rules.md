# Business Rules — mirror-operation-lifecycle

> 上流入力（consumes 全数）: `unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md`

## Rule Sources

`unit-of-work.md`のUnit 4、`unit-of-work-story-map.md`のAS-02〜06／08、`requirements.md`の三モード／境界／safe close、`components.md`のC6〜C8、`component-methods.md`の公開contract、`services.md`のorchestration順を正本とする。

## Mode Rules

| Mode | Lifecycle boundary | Manual CLI | Repair |
|---|---|---|---|
| off | 全operation suppress | 明示operationをguard付き実行 | one-time challenge必須 |
| prompt | operationごとask | 明示operationをguard付き実行 | one-time challenge必須 |
| auto | eligible operationを自動実行 | 明示operationをguard付き実行 | one-time challenge必須 |

autoはcreate／sync／closeだけへのstanding consentであり、repair、PR、merge、release、publish、deployへ拡張しない。

## Boundary Rules

| Boundary | Applicable operation |
|---|---|
| Intent Capture approval committed | Issueなしならcreate |
| Phase verification committed | Issueなしならcreate、ありならsync |
| Park committed | Issueなしならcreate、ありならsync |
| Workflow completion committed | create → final sync → close |
| Manual | 指定された1 operation |

boundary instanceはengine receipt由来であり、時刻やsessionから生成しない。同instance／operationは同event keyを使う。

## Mutation Ordering Rules

全mutationは`guard → prepare → readiness → attempted → remote → complete`を守る。createだけはprepare後、remote前に永続create identityとcurrent contextを照合する。

- readiness失敗、attempted write失敗ではremote call禁止。
- remote mutation前にattemptedの永続化成功が必要。
- permitは全guard通過後にC6だけが発行する。
- complete writeはremote success DTOを得た後だけ行う。
- no-effect-confirmed retryは`retry-after-no-effect`成功後だけ行う。
- fresh createはcandidate 0件確認後の`claim-create-attempt`をCAS成功させたcallerだけが実行する。

## Guard Rules

| Operation | Required guards |
|---|---|
| create | Issueなし、identity context一致、candidate classification |
| phase／park sync | provenance、repository、marker、Issue number |
| final sync | sync guards＋registry complete＋state Completed |
| close | close guards＋同completion instanceのfinal sync succeeded |

guard unknownはpassにしない。manual operationも同じguardを使う。

## Prompt Rules

- askはeventとoperationへbindする。
- expected promptはaskを返す前にC3へ永続化する。
- answerはexpected event／operationと完全一致する。
- approveは`approveMirrorPrompt`でexpected binding、最新state、retryOfを検証し、通常のprompt policyへ戻さない。
- skipはexpected prompt消費と同じtransactionで、receipt absentから`skipped-for-event`を永続化できる。
- skipはattempt／warningを新規作成せず、既存warningを消さない。
- same eventのskipは再質問しない。
- 別boundary instanceでは新eventとして評価する。

## Completion Rules

- successした前段だけが次段を解放する。
- create skip／failure／blocked／abandonedはsync／closeを抑止する。
- final sync skip／failure／blocked／abandonedはcloseを抑止する。
- close skipはIssueをopenのままworkflow completionを許す。
- auto loopは同boundaryで最大3 operation。
- 3 operation loopはworkflow completionだけ。Intent Capture／phase／park／manualは1 operationでterminal。
- promptは1 askにつき1 operation。

## Failure Rules

| Failure | Mirror result | Remote mutation | Workflow |
|---|---|---:|---|
| config invalid | suppressed | 0 | continue |
| state invalid | safety-blocked | 0 | continue |
| readiness／pre-remote write | pending/not-started | 0 | continue |
| no-effect-confirmed | pending | 既知0 | continue、次境界retry可 |
| outcome-unknown | pending／safety-blocked | 不明 | continue、reconcile必須 |
| provenance／repository | safety-blocked | 0 | continue |
| landing | safety-blocked | 0 | continue |
| post-remote complete write | safety-blocked | remote済み | continue、reconcile必須 |

全pathで`workflowMayAdvance=true`を維持する。retryは次boundaryまたは明示CLIだけで行い、background／busy loopを作らない。

## Retry Identity Rules

- 新boundary評価は新しいtrigger eventを持つ。
- 未完了operationは元receiptのevent／operation IDを継承し、新receiptを作らない。
- old pendingをcurrent boundaryの新operationより先にreconcileする。
- syncはremote body一致ならcomplete、不一致ならownership確認後に同じbodyへ収束させる。
- closeはclosedならcomplete、openなら全guard再検証後に同じIssueをcloseする。
- outcome-unknown sync／closeの再PATCHは`claim-observed-retry` CAS winnerだけが行う。
- pendingがterminalになるまでcurrent trigger eventの後続operationを開始しない。

## Audit Rules

- 新規event typeを作らず、既存`ARTIFACT_UPDATED`のContextへtransition、trigger event、operation event、operation ID、classificationを記録する。
- tool errorは既存`ERROR_LOGGED`を使用する。
- attempted state writeがoperation開始、complete writeが成功、warning／pending／blocked writeが失敗、skip writeがskipの正本である。
- reconciliation transitionはContextへ`reconciliation=true`を持つ。
- 全C3 mutationは`MirrorAuditContext`を必須引数として受け取る。
- state write成功前にsuccessを記録しない。

## Status and Security Rules

- statusはmode、source、Issue、provenance、pending、warning、次アクションを表示する。
- statusはGitHub mutationを行わない。
- warningはclassification、effect、timestamp、retryabilityを表示する。
- raw stderr、token、credential、header、URL query、absolute secret pathを出力／永続化しない。
- 色・emojiだけでstateを区別しない。

## Repair Rules

- repair statusはread-only。
- relink／abandonはauto consent外。
- marker欠落Issueは自動relinkしない。
- challengeはIntent、repository、operation、plan digestへbindする。
- exact phrase、10分、未消費を同じlockで検証する。
- repairとchallenge消費は同じatomic write。
- replay／別plan／別Intent／別repositoryはmutation 0件。
- relink createdAtはinspection時の注入clockで生成し、plan digestへfreezeする。
- repair成功は`repaired` outcomeを返し、abandonはIssue number nullを許す。

## Configuration Warning Rules

- invalid configはreceipt非依存`set-global-warning`でIntent stateへ永続化する。
- configuration warningはoperation／operationId null、effect=not-startedである。
- valid config確認後はconfiguration warningだけをclearし、他warningを消さない。

## Acceptance Scenarios

1. offでは全lifecycle boundaryのGitHub mutationが0件。
2. prompt createの回答前はremote mutation 0件。
3. same-event skip後のresumeではask 0件。
4. auto completionはcreate→sync→close以外の順序を取らない。
5. final sync失敗後のclose commandは0件。
6. provenance mismatchではmanual sync／closeも0件。
7. readiness失敗ではattempted receiptとremote commandが0件。
8. outcome-unknown createで候補0件なら新create 0件。
9. no-effect-confirmedはretry transition後に同operation IDで再試行する。
10. GitHub failureでもengine workflowはadvance可能。
11. status commandのmutation commandは0件。
12. repair challenge replayはstate／remote mutationとも0件。
13. non-default spaceのexplicit Intentがdefault spaceへ誤解決されない。
14. parallel fresh createはclaim CAS成功1件だけがremote createを実行する。
15. phase catch-up create成功後の追加syncは0件。
16. next boundary retryは新trigger eventと旧operation event／IDを同時に保持する。
17. attempted syncでremote body一致ならedit 0件でcompleteする。
18. attempted closeでIssue closedならclose PATCH 0件でcompleteする。
19. start／success／failure／skip／reconciliationが既存audit eventとreceiptから追跡できる。
20. prompt approveは再promptせず、approved-execution decisionへ進む。
21. invalid config warningはresume後のstatusにも残る。
22. concurrent outcome-unknown sync retryはCAS winner 1件だけがPATCHする。
23. create abandon repairはIssue numberなしのrepaired outcomeを返す。
