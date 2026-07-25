# Business Logic Model — mirror-contract-policy

> 上流入力（consumes 全数）: `unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md`

## Functional Boundary

`unit-of-work.md`の`mirror-contract-policy`、`unit-of-work-story-map.md`のAS-01／03／04／05、`requirements.md`のFR-1／2／7／10、`components.md`のC0〜C2、`component-methods.md`のMirror DTO／Policy contract、`services.md`のconfiguration／boundary flowを実装する。

入力は設定候補、Intent identity、engine-owned boundary、現在のMirror snapshotであり、出力はtyped config outcome、event identity、次actionである。C1だけがconfig fileをreadし、pure parserへlayer inputを渡す。filesystem write、GitHub、state mutation、stage routingは実行しない。

## Configuration Resolution Workflow

1. C1のread-only facadeが既存workspace selectorでGlobal、Space、Intentの各pathを解決し、存在とraw valueを`MirrorConfigLayerInput`として収集する。
2. pure parserが各存在値を文字列enum `off | prompt | auto`としてparseする。
3. boolean、未知文字列、配列、object、nullはinvalid issueとしてlayer／path／key／actual typeと共に保持する。
4. invalid issueが1件以上あれば全件を返し、fallbackや部分的なmerge結果を返さない。
5. 全値がvalidならGlobal → Space → Intentの後勝ちでresolveする。
6. どのlayerにも指定がなければ`prompt`を返す。
7. resolved modeと寄与したsource pathを返す。modeをIntent stateへ複製しない。

同じ入力集合は常に同じ結果を返す。環境時刻、cwd、GitHub readinessは判断へ含めない。

## Event Identity Workflow

1. coordinatorからIntent UUID、boundary kind、永続boundary instance、operationを受け取る。
2. versioned tuple `["mirror-event", 1, intentUuid, kind, instance, operation]`を作る。
3. tupleを標準JSON、UTF-8、base64url paddingなしでencodeし、`mirror-event:v1:`をprefixする。
4. phase名／stage名などの表示用detailはidentityへ含めない。
5. `instance`はengine-owned transition identityであり、同じboundaryへのresume／再入では不変なので同じkeyへ収束する。
6. timestamp、呼出し回数、session IDをidentityへ使用しない。

operation identityはstate prepare transitionが別途確定する。event identityは「どの利用者判断／lifecycle eventか」、operation identityは「どのremote attempt系列か」を表し、混同しない。

## Policy Decision Workflow

評価順は次で固定する。

1. inputは生成済み`MirrorEventIdentity`を必須とし、policyがIntent UUIDを推測しない。
2. manual inputならmodeを読まず`execute`を返す。C6はmanualを含む全operationへprovenance／repository／landing guardを必須適用する。
3. lifecycle inputでmodeが`off`なら、pendingや既存Issueの有無より先に`suppress: off`を返す。
4. configがinvalidならpolicyを呼ばず、coordinatorが`suppressed: configuration`へ変換する。manual inputはconfig resolveを必要としない。
5. 当該operationがboundaryに適用されなければ`suppress: not-applicable`を返す。
6. 同じevent keyに`skipped-for-event` receiptがあれば`suppress: skipped-for-event`を返す。
7. lifecycle mode=`prompt`ならinput eventを含む`prompt`を返す。
8. lifecycle mode=`auto`なら同じeventを含む`execute`を返す。

policyは安全guard、question文、GitHub command、warning文字列を作らない。利用者表示はC8、provenance／repository／landing／candidate guardと外部実行はC6が担当する。

## Completion Chain Selection

workflow completion boundaryではIntent UUID、現在のcompletion boundary、current stateから次の1 operationを返す。各operationのevent keyを生成し、同じcompletion instanceのreceiptだけを参照する。

| State | Next operation |
|---|---|
| 当該completion create receiptなし、Issueなし | `create` |
| 当該operationが`prepared`／`attempted`／`pending` | 同じoperation |
| 当該completion create成功または既存Issueあり、sync receiptなし | `sync` |
| 当該completion sync成功、close receiptなし | `close` |
| 当該completionの前段skip／safety-blocked | `null` |
| 当該completion close成功／skip／failure | `null` |

成功後だけ最新stateを再読込して次operationを評価する。create→sync→close以外の順序、前段失敗後の後続、1回のpolicy callで複数remote operationを返すことは禁止する。

## Data Transformation

| Input | Transformation | Output |
|---|---|---|
| layered raw config | parse＋precedence | `MirrorConfigOutcome` |
| Intent／boundary／operation | canonical identity | `MirrorEventIdentity` |
| mode／event／snapshot | ordered decision rules | `MirrorDecision` |
| Intent／completion boundary／snapshot | current-event predecessor check | `MirrorOperation | null` |

各transformはpureで、deep-equal inputにdeep-equal outputを返す。判別unionの全variantをexhaustiveに扱い、default branchで未知variantを吸収しない。

## Error and Edge Flow

- invalid configはoperation attemptを生成せず、GitHub mutationへ到達しない。
- absent config fileは未指定として扱う。permission／I/O／selector ambiguityはtyped `read-failure`となり、configuration suppressionへ変換する。
- unknown state schemaはpolicyへ渡さずState Storeのinvalid outcomeとして扱う。
- lifecycleの`off`中はpending receiptを保持するが、retry actionを返さない。manual inputはmodeを参照しない。
- same-event skipはwarningを新規生成せず、別eventの既存warningを消さない。
- distinct boundary instanceでは過去skipを参照せず、その時点のmode／stateから再評価する。
- manual operationもprovenance／landing guardを緩和しない。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-24T04:48:38Z
- **Iteration:** 1
- **Scope decision:** none

event identity、completion chain、manual mode、pure boundaryの公開契約が上流要件と整合せず、追加判断なしでは実装できない。

### Findings

- Blocker — decideMirrorAction inputにintentUuidまたは生成済みMirrorEventIdentityがなく、prompt／executeのevent、skip receipt照合、新規event生成を実装できない。
- Blocker — nextCompletionOperationに現在のcompletion boundary／event identityがなく、別boundary receiptと当該completionの結果を区別できない。
- Blocker — offをmanual operationより先に抑止するが、FR-7はmanual CLIをmodeにかかわらず実行可能とする。
- Major — C1をI/O-freeとしながら公開APIがprojectDirを受け、config filesystem I/O ownerとpure parser入力が未定義。
- Major — event keyの公開生成関数、serialization version、nested union順序／escaping規則がない。
- Major — completion前段結果をcurrent eventに限定するreceipt選択規則が必要。
- Global < Space < Intent、既定prompt、boolean拒否、invalid fail-closedは整合する。
- C0 leaf ownerとC2依存方向は整合する。
- create→sync→closeの意図は整合する。

## Review Iteration 1 Remediation

- Policy inputを`lifecycle | manual`へ分け、どちらも生成済みevent identityを必須にした。
- Completion inputへIntent UUIDと現在のworkflow completion boundaryを追加し、同一instanceのreceiptだけを選ぶ。
- Manual CLIはmodeから独立した明示同意とし、安全guardだけを適用する。
- C1をread-only config collectorとpure parserへ分けた。
- receipt keyをversioned positional tupleのJSON／UTF-8／base64urlへ固定した。

## Review Iteration 2 Remediation

- C2をmode、boundary applicability、event skipだけへ限定し、安全guardはmanualを含めC6へ統一した。
- current receiptの`prepared`／`attempted`／`pending`は同じoperationを返してreconcile／retryする。
- config collectorはtyped read outcomeを返し、permission／I/O／selector failureをconfiguration issueへ正規化する。
- 到達不能だった`MirrorDecision.blocked`を削除した。

## Review — Iteration 2

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-24T04:53:54Z
- **Iteration:** 2
- **Scope decision:** none

Iteration 1の主要な契約修正は反映されたが、manualを含む安全guardをC2の公開入力では評価できず、上流component責務とも矛盾するため実装可能性が未確定である。

### Findings

- Blocker — C2のPolicy inputではprovenance／repository／landing guardを評価できず、C4／C6責務と衝突する。C2へtyped guard contextを渡すかC2をmode／applicability／skipへ限定する必要がある。
- Major — current completion receiptがprepared／attemptedの場合のreconcile／retryかterminalかが未定義。
- Major — readMirrorConfigLayersのfilesystem／selector失敗契約がない。
- Major — invalid configはpolicyを呼ばないのにMirrorDecision.blocked configuration variantが残り到達不能。
- 生成済みevent、manual mode非依存、C1分離、event key、current instance選択は解消済み。
