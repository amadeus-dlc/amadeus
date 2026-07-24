# Business Logic Model — mirror-state-provenance

> 上流入力（consumes 全数）: `unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md`

## Functional Boundary

`unit-of-work.md`のUnit 2、`unit-of-work-story-map.md`のAS-02／04／05、`requirements.md`のFR-3／5／6／7／10、`components.md`のC3／C4、`component-methods.md`のState／Marker contract、`services.md`のdata ownership／concurrency contractを実装する。

C3は`amadeus-state.md`内のMirror領域をparse・検証・atomic transitionする。C4は永続済みcreate identityとremote Issue markerをpureに相互検証する。GitHub process、mode判断、lifecycle advance、Issue mutationは実行しない。

## State Codec Workflow

1. state document全体をUTF-8文字列として受け取る。
2. Mirror専用のversioned JSON blockをリテラルsentinel `<!-- amadeus:mirror-state:v1:start -->` と `<!-- amadeus:mirror-state:v1:end -->` で一意に特定する。
3. blockがない既存Intentは`revision=0`、未link、receipt／warning／challengeなしのempty snapshotとして読む。
4. sentinel重複、JSON duplicate key、unknown schema、unknown field、unknown status、型不正、entity invariant違反は全件をpath付きissueへ集約し、`invalid`を返す。
5. valid blockはC0 DTOへ変換し、receipt map keyが各receiptの`key`およびcanonical event keyと一致することを検証する。
6. `issueNumber`と`provenance.issueNumber`は両方null、または同じpositive integerでなければならない。
7. parseはdocumentを変更せず、同じbytesから同じoutcomeを返す。

JSON parserはduplicate keyを検出できるtoken-aware parserを使う。一般的な`JSON.parse`だけで重複を黙って上書きしない。

block wire formatは次で固定する。

```text
<!-- amadeus:mirror-state:v1:start -->
{"schema":1,"revision":0,"issueNumber":null,"provenance":null,"receipts":{},"warnings":[],"repairChallenges":{},"expectedPrompt":null,"auditOutbox":null}
<!-- amadeus:mirror-state:v1:end -->
```

JSON key順は上記root順と各entity定義順、空白なし、LF改行、末尾改行ありとする。既存blockがない場合は元document末尾の改行有無を保持したprefixに対し、末尾へ不足分だけLFを追加して「空行1行＋block」をappendする。既存documentのbytesはprefixとして変更しない。

## Atomic State Transition

`mutateMirrorStateAtomic`は既存state／audit lockを再利用し、次の順序を固定する。

1. lockを取得する。
2. lock内でstate document全体を再読込する。
3. codecでMirror snapshotをparseする。invalidならwriteせず終了する。
4. `auditOutbox`が存在すれば、新transitionより先にその`ARTIFACT_UPDATED`をtransaction IDでidempotent appendし、成功後にoutboxだけをatomic clearする。drain失敗時は新transitionを実行しない。
5. current Mirror revisionとcallerのexpected revisionを比較する。不一致なら`conflict(actualRevision)`を返す。
6. transitionをpure reducerへ1回適用する。
7. transaction IDを`mirror-state:{intentUuid}:{eventKey}:{operationId}:{transitionKind}:{nextRevision}:{digest}`として生成し、完全な既存`ARTIFACT_UPDATED` projectionと共に単一`auditOutbox`へ格納する。
8. reducer後の全invariantを再検証し、元documentのMirror blockだけをcanonical blockへ置換する。
9. 同一directoryの一時fileへwrite・file fsyncし、atomic rename後にparent directory fsyncする。ここをbusiness stateのcommit pointとする。
10. commit済みoutboxのaudit blockをidempotent appendする。失敗時は`committed-audit-pending(transactionId)`を返し、outboxを残す。
11. audit成功後、outboxだけをrevision不変のatomic write＋directory fsyncでclearし、written documentとnew snapshotを返す。

Mirror block外のprefix／suffixはsubstringとしてそのまま再利用し、改行、空白、未知の非Mirror sectionを再serializeしない。rename前のwrite／file fsync／rename失敗では元fileを残し`io-failure`を返す。rename後のdirectory fsync失敗はtarget bytesが新旧不確定なので`durability-unknown(transactionId)`を返す。次回readで新state＋outboxならauditをdrainし、旧stateならtransitionを再評価する。outboxがある間は別transitionを開始しないためtransaction衝突を作らない。outbox clear失敗はaudit済みoutboxを残し、再入時にidempotent append確認後clearへ収束する。

## Transition Reducer

### Prepare

- event keyが未登録なら、caller supplied `operationId`／`preparedAt`から`prepared` receiptを作る。
- createでは`intentDir`、repository、eventのIntent UUID、同じoperation ID／timestampから`MirrorCreateIdentity(schema=1)`を同時に作り、receiptと同じrevision updateへ保存する。
- event keyが既登録ならtransition inputの候補値を捨て、既存receiptを変更せず返す。
- 同じevent keyでoperation、Intent UUID、boundaryが一致しない場合はinvalidであり、上書きしない。

### Attempt and Completion

- `mark-attempted`は`prepared`だけから遷移し、caller supplied `attemptedAt`を保存する。同値再入は`unchanged`、異なる値での再適用はinvalidとする。
- `claim-create-attempt`はfresh prepared create receiptだけをCASでattemptedへ進める。candidate 0件確認後、このwriteを成功させたcallerだけがremote createできる。
- `retry-after-no-effect`は`pending + lastEffect=no-effect-confirmed`だけから同じoperation IDの`attempted`へ戻し、新しいattemptedAtを保存してlastEffect／同operation retry warningをclearする。`outcome-unknown`や別operation IDでは拒否する。
- `claim-observed-retry`はoutcome-unknown syncのbody不一致またはcloseのopenをremote viewで確認した場合だけ、pendingをCASでattemptedへ戻す。winnerだけが冪等PATCHできる。
- `complete`は`attempted | pending`からだけ遷移し、Issue numberと`completedAt`を保存する。
- create completionはprovenance必須で、receiptのcreate identity、remote Issue number、repositoryが一致する場合だけ、receipt=`succeeded`、root issue number、provenanceを同じrevision updateで確定する。
- sync／close completionは既存provenanceを変更せず、対象Issue number一致を必須にする。
- remote成功後にcomplete writeが失敗しても、永続済み`attempted`を残すため、次回candidate reconciliationの根拠を失わない。

### Skip, Pending, Block and Repair

- `skip-for-event`はreceipt absentでもevent、operation ID、preparedAt、completedAtから`skipped-for-event` receiptをatomic作成できる。既存receiptではevent／operation一致時だけterminalにする。
- `set-warning`はreceipt statusを変えず、同じoperation IDへwarningを保存する。`prepared`ではeffect=`not-started`だけを許可し、readiness失敗とattempted write失敗のclassification／summaryを再起動後も復元できる。
- `set-global-warning`はreceiptなしのconfiguration warningを保存する。operation／operationIdはnull、effect=not-startedとし、valid config時は`clear-global-warning`でconfigurationだけを消す。
- `set-expected-prompt`はevent／operation／issuedAtをsnapshotへ保存し、同じbindingの再入は`unchanged`、未消費の別bindingはconflictとする。回答時は`consume-expected-prompt`がevent／operation完全一致時だけbindingを削除する。
- `mark-pending`は`attempted`からだけ遷移し、`no-effect-confirmed | outcome-unknown`をreceiptの`lastEffect`と同operation warningへ保存する。readiness失敗は`prepared`を維持し、`pending`へ遷移しない。
- `mark-safety-blocked`はreceiptと同じoperation IDのwarningだけを追加する。
- warning keyは`operationId + classification + occurredAt`のcanonical tupleとし、同一warning再入で重複させない。
- `repair-link`は検証済みprovenanceとroot Issue numberを同時に置換する。
- `abandon-attempt`は指定operation IDの未完了receiptだけをterminal repair resultへ遷移させ、成功receiptは変更しない。

## Marker Codec

markerはGitHub commentとして1行だけ描画する。

`<!-- amadeus-intent-mirror:v1 {base64url(canonical-json)} -->`

payload field順は`schema, intentUuid, intentDir, repository.owner, repository.name, repository.canonical, operationId, preparedAt`で固定する。UTF-8 JSONをbase64url paddingなしでencodeする。描画は永続済み`MirrorCreateIdentity`だけを受け、候補値から直接生成しない。

parseは完全一致するmarkerがbody内に0件なら`missing`、1件ならschema／encoding／field／canonical repositoryを検証して`parsed`、2件以上またはmalformedなら`invalid`とする。別versionをv1として推測しない。marker以外のIssue本文を解釈しない。

## Ownership and Candidate Classification

ownership verificationは次の順序で行う。

1. remote Issue repositoryとlocal provenance repositoryをcanonical比較する。不一致は`wrong-repository`。
2. markerをparseする。欠落は`missing-marker`、invalidは`mismatch`。
3. marker identityをlocal provenanceのcreate identityと全field比較する。
4. remote Issue numberとlocal provenance Issue numberを比較する。
5. 全一致時だけ`verified`を返す。

candidate classificationは順序付きdecision tableとする。

| Receipt / local state | Verified candidates | Outcome |
|---|---:|---|
| fresh `prepared`、local provenanceなし | 0 | `create-new` |
| fresh／attempted、local provenanceなし | 1 | `adopt` |
| `pending`かつ`lastEffect=no-effect-confirmed`、local provenanceなし | 0 | `retry-after-no-effect`後、同じoperation identityで`create-new` retry |
| `attempted`または`pending`かつ`lastEffect=outcome-unknown`、local provenanceなし | 0 | `safety-blocked: zero-after-attempt` |
| 任意 | 2以上 | `safety-blocked: ambiguous` |
| candidateありだがidentity不一致 | 任意 | `safety-blocked: mismatch` |
| local provenanceあり | 同じIssue 1件 | `adopt`相当のverified convergence |

候補配列の順序で結果を変えず、verified candidateをIssue number昇順へ正規化してから件数判断する。曖昧時に先頭候補を採用しない。

createのcandidate判断前に、receiptのcreate identityにあるIntent UUID、Intent directory、canonical repositoryをcurrent execution contextと完全一致検証する。不一致時はcandidate searchもremote createも行わず`safety-blocked: mismatch`とする。

## One-time Repair Challenge

1. read-only inspectionがcanonical repair planを作る。
2. planをfield順固定JSONでserializeし、SHA-256 lowercase hex digestを作る。
3. C3はchallenge ID、Intent UUID、canonical repository、operation ID、digest、expected phrase、issuedAtを`repairChallenges` mapへatomic writeする。
4. applyは同じlock内で最新stateとchallengeを再読込する。
5. challenge ID、Intent UUID、repository、operation ID、digest、exact phrase、未消費、`issuedAt <= now <= issuedAt+10分`をすべて検証する。
6. repair transitionとactive challengeのmap削除を同じrevision updateで行い、challenge ID／digest／消費時刻をそのtransitionのaudit outboxへ保存する。abandonではreceipt statusを`abandoned`にし、completedAtを保存する。

`repairChallenges` mapは未消費かつ有効期限内のactive challengeだけを保持する。challenge発行前に期限切れを即時pruneし、そのID／digest／理由を発行transitionのaudit outboxへ記録する。消費済みchallengeはrepair commit時にmapから除去済みである。activeが100件なら新challengeを拒否し、既存challengeを破壊しない。

warning集合は通常slot 999件と予約済み`state-capacity` slot 1件に分ける。同一`operationId + classification + effect`は最新warningへcoalesceし、旧値はtransaction auditへ残す。新remote operation前に通常slotを確保できなければ予約slotへcapacity warningを保存し、remote mutationを開始しない。

失敗時はstateを変更しない。期限切れ、再利用、別plan、別Intent、別repository、別operation、phraseの大小文字／空白差はすべて拒否する。時刻比較は注入clockが生成したRFC 3339 UTCをinstantへparseして行う。

## Failure and Concurrency Scenarios

- parallel caller A/Bが同revisionで開始した場合、lock取得後に先行した1件だけがwriteし、後続はactual revision付きconflictとなる。
- partial temp write、flush failure、rename failureでは元documentが正本のまま残る。
- parse invalid、CAS conflict、repair validation failureではtemp fileもremote callも作らない。
- marker mismatch、candidate ambiguous、challenge replayはtyped outcomeであり、例外による強行継続へfallbackしない。
- C3／C4のfailureはC6へ返すが、本Unitはworkflow advance可否を決定しない。


## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-24T05:14:54Z
- **Iteration:** 1
- **Scope decision:** none

永続状態契約と遷移表に実装不能な矛盾があり、repair、retry、CAS、byte-preserving codecを開発者が推測なしに実装できない。

### Findings

- Blocker — Repair challengeをC0/C3契約で表現できない。MirrorStateSnapshotにchallenge集合がなく、MirrorRepairChallengeにconsumedAtがなく、MirrorTransitionにも発行・検証・消費transitionがない。さらにabandon-attempt後のterminal statusもMirrorReceiptStatusに存在しない。
- Blocker — prepared → pendingがentity invariantと両立しない。business-rules.mdはprepared | attemptedからmark-pendingを許可する一方、domain-entities.mdはpendingにattemptedAtを必須とする。mark-pending入力にはattemptedAtがなく、prepared receiptをvalidなpendingへ変換できない。
- Blocker — 再起動後の安全なretry判断に必要な副作用確定性が失われる。Gatewayはno-effect-confirmedならretry可能とするが、receipt／warningはeffectを永続化しない。次回はattempted | pendingかつ候補0件として一律zero-after-attemptへ安全停止し、FR-6の一時障害自動retryを実現できない。
- Major — idempotent再入とrevision規則が矛盾する。既存prepare、同値mark-attempted、同一warningはno-opとされる一方、SP-A03は1 transitionごとにrevisionを正確に1増加とする。no-opがwrite／revision増加するのか、既存snapshotを無変更で返すのかをWriteOutcomeまで定義する必要がある。
- Major — 永続codecのwire formatが未確定。sentinelのリテラル、JSON block schema、canonical whitespace/newline、block欠落時の規定位置が定義されていない。非Mirror bytes保持とbyte-for-byte failure testを一意に実装できない。

## Review Iteration 1 Remediation

- C0へrepair challenge map、consumedAt、proof、issue／consume transition、`abandoned` statusを追加した。
- readiness失敗は`prepared`のまま維持し、`mark-pending`は`attempted`後だけへ限定した。
- receipt／warningへeffect certaintyを永続化し、`no-effect-confirmed`だけを同じoperation identityで再試行可能にした。
- 同値再入は`unchanged` outcome、revision不変、writeなしへ固定した。
- state blockのsentinel、root JSON、key順、空白、LF、末尾append／置換範囲をwire contractとして固定した。

## Review — Iteration 2

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-24T05:21:08Z
- **Iteration:** 2
- **Scope decision:** none

Iteration 1のrepair challenge、effect永続化、no-op revision、wire formatは改善されたが、retry・skip・failure provenance・repository bindingの状態遷移が未閉包であり、C3/C4を推測なしには実装できない。

### Findings

- Blocker — pending + no-effect-confirmedからの安全なretryが遷移不能。同じoperation identityでcreate-new retryを要求する一方、mark-attemptedはpreparedからしか許可されず、pending → attemptedまたは再attemptを記録するtransitionがない。
- Blocker — promptのskipを永続化できる契約がない。skip-for-event入力はkeyとcompletedAtだけだが、質問時点ではreceiptが存在し得ず、必須のevent、operationId、preparedAtを生成できない。事前prepareするflowまたはabsentからskipped receiptを作るtransitionが必要。
- Blocker — 同一event再入時にprepareが新しいrepository／intentDir候補を無条件破棄する一方、C6には永続済みcreate identityと現在contextのrepositoryをremote mutation前に照合するguardがない。repository変更時、旧repository markerを新repositoryへcreateしてlocal completeだけ失敗する孤立Issueを生成し得る。
- Major — prepared状態だけでは通常のprepare直後、readiness失敗、attempted write失敗を識別できない。setMirrorWarningはcomponents.mdに存在するがcomponent-methods.mdのAPI／transitionへ解決せず、FR-6が要求する原因・retry情報の永続化と正確なstatus復元ができない。
- Major — terminal abandoned receiptをnextCompletionOperationが扱っていない。同一completion boundaryで後段を抑止するのか再評価するのかが未定義。

## Review Iteration 2 Remediation

- `pending + no-effect-confirmed → attempted`専用transitionを追加し、同じoperation identityのretryを閉包した。
- `skip-for-event`をevent／operation／時刻付きにし、receipt absentからterminal receiptを作成可能にした。
- 永続create identityとcurrent Intent UUID／directory／repositoryのremote前照合をC6へ追加した。
- `set-warning` transitionを追加し、`prepared`を維持したままreadiness／attempted write失敗原因を永続化可能にした。
- `abandoned`を同じcompletion boundaryのterminalとして後段抑止へ統一した。
