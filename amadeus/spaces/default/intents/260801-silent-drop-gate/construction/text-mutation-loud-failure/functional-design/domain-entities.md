# Domain Entities — text-mutation-loud-failure

## 境界と上流トレーサビリティ

本モデルは `unit-of-work.md` の U2 entity boundary、`unit-of-work-story-map.md` の SC-06、`requirements.md` のtarget不存在／bytes不変契約、`components.md` の R1／R2 ownership、`component-methods.md` の `ValidatedStageState`／`TextMutationResult`、`services.md` の既存state ownershipを具体化する。

新しい永続entityや公開serviceを作らない。既存state documentをaggregate rootとして再利用し、validation済みviewとprocess-local mutation resultだけを追加する。

## Entity一覧

| Entity／Value Object | Owner | 永続性 | 役割 |
|---|---|---|---|
| State document | 既存runtime | version-controlled／runtime file | stage checkbox、suffix、statusの正本bytes |
| `ValidatedStageState` | R1 | process-local opaque | grammar、一意性、document identityを証明済みのread-only view |
| `StageLineIndex` | R1内部 | process-local | slugからcanonical line range／checkbox／suffixへの一意map |
| `CheckboxMutation` | R1 | process-local command | target slugと期待checkbox state |
| `SuffixMutation` | R1 | process-local command | target slugと期待 `EXECUTE | SKIP` suffix |
| `TextMutationResult` | R1 | process-local result | `changed | not-found` の閉じたoperation outcome |
| `StateMutationInvariantError` | R1→R2 | process-local exception | setter構築algorithmのreparse／postcondition破損をtyped fieldで運ぶ |
| `MutationTransaction` | R2 caller | process-local | 1件以上のmutationとall-or-nothing副作用境界 |
| Typed caller failure | 既存CLI boundary | process-local result | validation／not-found／duplicate-target／invariant／write failureをsuccess前に伝播 |

## `ValidatedStageState`

`ValidatedStageState` はconstructorを公開せず、validator成功時だけ生成するopaque valueである。

| 属性 | 制約 |
|---|---|
| originalContent | validation対象のexact bytes |
| documentIdentity | original bytesのdigest |
| stageIndex | slugごとにちょうど1件のcanonical line |
| grammarVersion | 既存state parser contractのversion |

index entryはslug、line range、checkbox state、suffix、非mutation部分のprojectionを持つ。document identityが異なるcontentへindexを再利用できない。

Lifecycleは `raw → validated` または `raw → validation failure` の一方向だけである。validated valueをin-place更新せず、mutation後contentは再validationして新しいvalueを作る。

## `TextMutationResult`

| kind | 必須属性 | 不変条件 |
|---|---|---|
| `changed` | content | targetが一意に存在し、期待postconditionが成立 |
| `not-found` | target | target 0件。contentは持たず、input `ValidatedStageState.originalContent` は不変 |

`changed.content` はinputと同一でもよい。これはidempotent operation成立を表す。物理write要否はcallerがbefore／after bytesを比較して決め、result variantを増やさない。

validation failureは `TextMutationResult` へ入れない。malformed／duplicate documentはopaque valueを生成できず、setterのpreconditionへ到達しない。mutation後reparse／postcondition不成立も2variantへ畳まず、`StateMutationInvariantError` をthrowしてR2 transaction boundaryへ送る。

## `StateMutationInvariantError`

`StateMutationInvariantError` は module-internal exceptionであり、`code="STATE_MUTATION_INVARIANT"`、`target`、`operation=checkbox | suffix`、`reason=reparse-failed | postcondition-failed | non-target-changed` を持つ。setterは通常の不存在をthrowせず `not-found` で返し、このexceptionは構築algorithmの不変条件破損だけに使う。

R2 transaction boundaryは `instanceof` 相当の型guardでこの型だけをcatchし、`MutationTransaction.failed(invariant)` へ遷移させて既存CLI errorへ写像する。未知のexceptionは同じcatchで成功／typed failureへ畳まず、外側の既存internal error boundaryへ再throwする。failure-injection testはparser／renderer seamを差し替えてこの経路を決定的に作る。

## Mutation target

`CheckboxMutation` はtarget slugと期待markerを持つ。`SuffixMutation` はtarget slugと期待suffixを持つ。target identityはdisplay textやline numberではなくcanonical slugで指定する。

- target 0件: `not-found`。
- target 1件、期待値と一致: same-bytes `changed`。
- target 1件、期待値と不一致: 対象rangeだけを変更し、reparse後に `changed`。
- target複数: validatorがduplicateとして拒否済み。

## `MutationTransaction`

| 状態 | 意味 | 許可遷移 |
|---|---|---|
| prepared | original validated、mutation list受領 | targets-validated または failed |
| targets-validated | `slug + dimension` keyが全件unique | applying |
| applying | in-memoryで順次適用 | validated-final または failed |
| validated-final | 全postcondition成立 | written または idempotent-complete |
| written | atomic write成功 | completed |
| idempotent-complete | final bytesがoriginalと同一 | completed |
| failed | validation／not-found／duplicate-target／invariant／write failure | 終端。永続audit／success禁止 |
| completed |既存audit／success契約まで完了 | 終端 |

`failed` から再試行状態へ遷移しない。中間contentは永続化せず、writeはtransaction全体で最大1回とする。

同一target keyが2件以上なら、期待値が同じでも相反しても適用前にtyped duplicate-target failureとする。同じslugへのcheckbox mutationとsuffix mutationはdimensionが異なるため共存できる。last-write-winsやcaller入力順優先を採用しない。

## Aggregate関係

関係のテキスト表現は次のとおりである。

State document 1 → 1 `ValidatedStageState` → N mutation command → 1 `MutationTransaction`

`MutationTransaction` 1 → N `TextMutationResult` → 0..1 atomic write → 0..1既存audit／success

failure時はatomic writeと全永続audit／successのcardinalityが全て0になる。診断はstderrだけへ出る。

## Caller ownership

- R1 validator／setterはpure text transformationとpostcondition検証を所有し、filesystem／audit／stdoutを扱わない。
- R2 callerはfile read、validation invocation、resultのexhaustive分岐、`StateMutationInvariantError` の型guard、atomic write、audit／success順序を所有する。
- callerは `not-found` をtyped failureへ写像するが、resultの意味を変更しない。
- bulk callerはtransaction全体を所有し、個別setterへwrite権限を渡さない。
- generated projectionはentity ownerではなく、canonical sourceから再生成されるconsumerである。

## Entity constraints

- `not-found.target` は要求slugと一致し、input original contentはbyte-identicalのままである。
- idempotent `changed.content` とoriginal contentはbyte-identicalである。
- non-idempotent `changed.content` はtarget range以外のbytesを維持する。
- mutation後のnew `ValidatedStageState.documentIdentity` は返却content digestと一致する。
- final transactionの全targetがstage index上で期待値を持つ。
- failureにaudit event identityやsuccess payloadを持たせず、state bytesと全永続audit bytesを呼出前から変えない。
- caller error messageはdiagnosticであり、result discriminantの代用にしない。

## Entity acceptance

- validatorだけがopaque valueを生成できることを型検査で固定する。
- malformed／duplicate／absent／already-set／changedの全caseをfixture化する。
- checkboxとsuffixのpostcondition／非対象bytes invarianceを検証する。
- `not-found` とidempotent `changed` が同じbytesでも異なるkindになる。
- bulk transactionの中間failureで永続stateがoriginalのままになる。
- bulk transactionのduplicate target keyが同値／相反の双方で適用前に失敗する。
-全callerのwrite／audit／success adapter call countと順序を検証する。
- jump／utility／stateの各error boundaryがstderr `{"error": message}`、exit 1、stdout／successなしを維持する。
- parser／renderer seamによるpostcondition failure injectionが `StateMutationInvariantError` を経て `MutationTransaction.failed(invariant)` へ写像され、write／全永続audit／successが0件になる。
-既存state serialization、CLI outcome、generated projectionの互換性を回帰検証する。
