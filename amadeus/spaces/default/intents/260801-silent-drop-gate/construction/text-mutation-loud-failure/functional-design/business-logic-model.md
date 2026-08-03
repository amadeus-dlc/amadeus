# Business Logic Model — text-mutation-loud-failure

## 目的と上流トレーサビリティ

本設計は U2 `text-mutation-loud-failure` の #1874 修正境界を定義する。`setCheckbox`／`setStageSuffix` のsilent `String.replace` を、検証済みstate document上の閉じた結果へ置き換え、対象不存在や不正stateを全callerでwrite／audit／successより前に失敗させる。

入力は `unit-of-work.md` の U2 境界、`unit-of-work-story-map.md` の SC-06 と Unit 内 acceptance dependency、`requirements.md` の FR-04／11／15・NFR-03／05／06／09、`components.md` の R1／R2責務、`component-methods.md` のvalidation／setter／caller契約、`services.md` の既存Amadeus Runtime Commandsである。新規service、公開API、暗黙resync、retry、warning successは追加しない。

## Validation workflow

raw state documentはmutationより前に一度だけparseし、成功時だけopaque `ValidatedStageState` を生成する。

1. state document全体を既存grammarでparseする。
2. stage section、checkbox marker、suffixの構文を検証する。
3. stage slugごとのcanonical line identityを作り、各slugがちょうど1件であることを検証する。
4. duplicate、malformed section／checkbox／suffix、unknown canonical shapeがあれば既存typed validation failureを返す。
5. 成功時はoriginal bytes、parsed stage index、document identityを結合したread-only `ValidatedStageState` を返す。

setterはraw stringを受け取らず、`ValidatedStageState` とmutation targetだけを受け取る。callerがvalidationを省略してsetterを呼ぶ型経路を作らない。

## Setter algorithm

### `setCheckbox`

1. validated indexからtarget slugを検索する。
2. targetが0件なら `{ kind: not-found, target: slug }` を返す。bytes不変はinput `ValidatedStageState.originalContent` との比較で検証する。
3. targetが1件なら期待checkbox stateを投影する。
4. 既に期待値なら同じbytesを `changed` として返す。
5. 値が異なる場合は対象rangeだけを置換し、他bytesを維持する。
6. 返却contentを再parseし、targetが1件、期待checkbox、他stage identity不変を確認する。
7. postcondition不成立はsetterの構築algorithm／parser不変条件の破損であり、正常分岐へ追加せず module-internal `StateMutationInvariantError(code="STATE_MUTATION_INVARIANT", target, operation, reason)` をthrowする。`reason` は `reparse-failed | postcondition-failed | non-target-changed` の閉集合とする。

### `setStageSuffix`

`setCheckbox` と同じ順序で、target slugのsuffixだけを `EXECUTE | SKIP` へ設定する。既に期待suffixなら同一bytesの `changed`、target 0件だけを `not-found` とする。再parseでtarget suffix、line一意性、他stage identity不変を検証する。

`TextMutationResult` は `changed(content)` と `not-found(target)` の2variantだけとする。`changed` は「一意targetが存在し、返却contentのpostconditionが成立」を意味し、物理bytes差分の有無を意味しない。`not-found` は診断用targetを持ち、contentを持たない。

## Caller transaction

単一mutation callerは次の固定順序を使う。

1. state／auditのbefore bytesを取得する。
2. raw stateをvalidateする。
3. transaction boundary内でsetterを1回呼ぶ。`StateMutationInvariantError` だけを型guardでcatchして `MutationTransaction.failed(invariant)` へ遷移させる。未知のexceptionは外側の既存internal error boundaryへ再throwする。
4. `not-found` またはvalidation failureを既存typed CLI errorへ昇格し、returnする。
5. `changed` contentをfinal reparseし、caller固有postconditionを検証する。
6. contentがbeforeと異なる場合だけ既存atomic writerで1回writeする。同一bytesのidempotent `changed` は不要な物理writeをしない。
7. writeが必要な場合は成功を通知する前にwrite成功を確認する。
8. 既存契約が要求するaudit／success JSONを、その順序を維持してemitする。

failure pathではwrite、永続workflow audit、success JSONを実行しない。診断先はstderrだけとし、error telemetryを含む永続audit writerを呼ばない。state bytesと全永続audit bytesを呼出前から変えず、機械成功へ変換しない。

## Bulk mutation transaction

bulk checkbox change、phase／final completion、gate操作、Bolt fragment mergeなど複数targetを扱うcallerはall-or-nothingとする。

1. original raw stateを1回validateする。
2. mutation開始前にtarget key=`slug + dimension(checkbox | suffix)` を検証し、同じkeyが2件以上なら同値／相反を問わずtyped duplicate-target failureにする。同じslugでもcheckboxとsuffixは別keyとして許可する。
3. unique targetをkeyのbyte順でin-memory contentへ適用する。
4. 各step後に再parseして次の `ValidatedStageState` を作る。
5. 1件でも `not-found`／validation failureなら全中間contentを破棄する。
6. 全target成功後にfinal documentを再parseし、全postconditionと非対象identity不変を検証する。
7. bytes差分がある場合だけatomic writeを1回行う。
8. write成功後にだけmutation audit／successをemitする。

部分write、stepごとのaudit、失敗後の残存successを禁止する。

## Caller inventory とfailure propagation

| 所有経路 | Mutation | 既存error mapping | success非生成条件 |
|---|---|---|---|
| `amadeus-jump.ts` skip／reset／target start | `setCheckbox` | jumpの既存error boundary、stderr `{"error": message}`、exit 1、stdoutなし | validation／not-found／invariant／write failureでjump success JSONとmutation auditなし |
| `amadeus-utility.ts` compose scope suffix flip | `setStageSuffix` | utilityの既存`die` boundary、stderr `{"error": message}`、exit 1、stdoutなし | 同failureでrecompose success JSONとmutation auditなし |
| `amadeus-utility.ts` set-status | `setCheckbox` | utilityの既存`die` boundary、stderr `{"error": message}`、exit 1、stdoutなし | 同failureで`updated:true` JSONとmutation auditなし |
| `amadeus-state.ts` bulk checkbox／advance／phase・final completion | `setCheckbox` | stateの既存error boundary、stderr `{"error": message}`、exit 1、stdoutなし | 同failureでtransaction success JSONとmutation auditなし |
| `amadeus-state.ts` gate start／approve／reject／revise／skip | `setCheckbox` | stateの既存error boundary、stderr `{"error": message}`、exit 1、stdoutなし | 同failureでgate success JSONとmutation auditなし |
| `amadeus-state.ts` Bolt fragment merge | `setCheckbox` | stateの既存error boundary、stderr `{"error": message}`、exit 1、stdoutなし | 同failureでmerge success JSONとmutation auditなし |

not-found messageは `stage target not found: <target>`、validationは既存validator message、postcondition不成立は `state mutation postcondition invariant failed: <target>` を既存 `error` fieldへ入れる。新しいtop-level JSON field、exit code、success variantを追加しない。validation／not-found／duplicate-target／invariantのerror boundaryはstderrへだけ書き、永続telemetry／auditへappendしない。

全callerはresultをexhaustiveに検査し、`not-found` をempty change、warning、successへ畳まない。認可されたretry／暗黙resyncは0回である。

## 決定表

| Input state | Target | Expected value | Result | Write／audit／success |
|---|---|---|---|---|
| malformed／duplicate | 評価しない | — | validation failure | 全て0件 |
| valid | 0件 | 任意 | `not-found(target)`、input bytes不変 | 全て0件 |
| valid | 1件 | 既に期待値 | `changed`、同一bytes | write 0件、既存idempotent success契約だけ継続 |
| valid | 1件 | 異なる | postcondition成立の `changed` | atomic write成功後にaudit／success |
| valid | 1件 | 異なる | reparse／postcondition失敗 | internal invariant error | 全て0件 |
| valid bulk | 一部0件／不正 | 任意 | transaction failure | 全中間content破棄、全て0件 |
| valid bulk | duplicate target key | 同値／相反 | typed duplicate-target failure | mutation開始前、全て0件 |

idempotent success時のaudit／success有無は各callerの既存契約を維持するが、state bytesを書き直さない。新しいaudit eventやsuccess shapeを追加しない。

## Error handling

- validation failureはduplicate／malformedの既存typed errorを維持する。
- `not-found` はtarget slugとoperation contextを含むtyped caller errorへ変換する。
- mutation後reparse／postcondition不成立は `StateMutationInvariantError` をthrowする。R2 transaction boundaryはこの型だけをcatchして `MutationTransaction.failed(invariant)` へ遷移させ、既存CLI error boundaryへ送る。これは正常なdomain分岐ではない。
- その他のunexpected exceptionはtransaction boundaryで変換せず、外側の既存internal error boundaryへ再throwする。
- error message解析でresult kindを判定しない。
- failure診断をstate documentやいかなる永続auditへも追記せず、stderrだけへ出力する。
- write failureはsuccess／auditより前にreturnし、callerの既存atomic write error契約へ従う。

## Acceptanceシナリオ

- malformed section、malformed checkbox／suffix、duplicate slugがsetter前に失敗する。
- target 0件で `not-found`、state／全永続audit bytes不変、success JSON 0件になり、診断はstderrだけへ出る。
- already-set targetで同一bytesの `changed` となり、`not-found` と区別される。
-変更targetで再parse後のpostconditionが成立し、非対象bytesが不変になる。
- postcondition failure injectionでwrite／audit／successが0件になる。
-全caller inventoryで `not-found` をexhaustiveに処理する。
- bulk mutationの途中target不存在で部分write／部分auditが0件になる。
- bulk mutationのduplicate target keyを適用前に拒否し、同値／相反の双方でwrite／mutation audit／successが0件になる。
- caller別error mappingがstderr `error` JSON、exit 1、stdoutなしを維持する。
- retry／暗黙resync／warning successが0件であることをcall countで証明する。

本Unitはcanonical runtime sourceとfocused unit／integration testを所有する。generated projectionと全harness driftは `repository-adoption` に引き渡す。

## Revision Cycle 2 Resolution

- FR-11の不変条件を弱めず、validation／not-found／duplicate-target／invariantの全failureでstate bytesと全永続audit bytesを呼出前から不変にする。診断先はstderrだけである。
- `StateMutationInvariantError` の型、setterからのthrow規則、R2 transaction boundaryの型guard、`MutationTransaction.failed(invariant)`、未知exceptionの再throwを固定し、error transportを閉じた。
- parser／renderer seamを差し替えるfailure-injection testでinvariant pathを到達可能にし、write／永続audit／successが0件であることを検証する。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-02T04:53:39Z
- **Iteration:** 1
- **Scope decision:** none

validated boundaryとcaller順序は明確だが、結果型の上流不整合、postcondition failureのtransport欠落、bulk重複targetの意味が実装を一意化していない。

### Findings

- `TextMutationResult.not-found` のshapeが上流 `component-methods.md` と矛盾する。上流は `{ kind: "not-found"; target: string }` と定義する一方、3つのFunctional Design成果物はoriginal bytesを持つ `{ kind: "not-found"; content }` としている。caller診断にはtargetが必要であり、bytes不変は入力 `ValidatedStageState.originalContent` から検証できるため、どちらを正本にするか決め、constructor・exhaustive switch・互換性testを同じshapeへ揃える必要がある。
- setterのmutation後reparse／postcondition failureを運ぶ型が存在しない。`setCheckbox`／`setStageSuffix` の公開済みsignatureは `TextMutationResult` を返し、その閉集合は `changed | not-found` だけだが、Functional Designはreparse不成立を「typed validation failure」として返し、throwを正常分岐に使わないと要求する。`changed` にも `not-found` にも写像できないため実装不能である。setter returnを既存validation failureとの明示unionにするか、reparseを返却不能な内部assertionとするかを決め、postcondition failure injectionの期待resultまで定義する必要がある。
- bulk mutation listの同一target重複・競合規則がない。同じslugへ同一operationを複数回適用する場合と、checkboxのtrue→falseやsuffixのEXECUTE→SKIPのような相反operationを含む場合について、重複排除、拒否、優先順位のどれかが未定義である。「決定的順序」で並べるだけでは、全target postconditionを同時に満たせない競合を解決できず、caller入力順によって意味が変わり得る。transaction開始前のtarget-set validation、競合時のtyped failure、write／audit 0件のacceptanceが必要である。
- 全callerを既存typed CLI errorへ昇格するとするだけで、公開互換性を判定できる写像がない。jump、compose、set-status、state transaction、gate、Bolt mergeごとに、validation failure／not-foundが既存のどのerror code、exit、JSON shapeへ変換されるかが示されておらず、「新しい公開variantを追加しない」をテストできない。caller別の既存error mappingとsuccess非生成条件を閉じた表にする必要がある。

## Review — Iteration 2

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-02T04:56:56Z
- **Iteration:** 2
- **Scope decision:** none

Iteration 1の4件は概ね反映されたが、audit bytes不変条件の無承認な緩和とinternal invariant failureのtransportに残存不整合がある。

### Findings

- 上流FR-11とU2完了条件はnot-found時のstate／audit bytesを呼出前と同一にするが、更新後設計は対象を「mutation audit」に狭め、既存error telemetryの発火を許可している。error telemetryが同じ永続auditへappendする場合、公開結果がfailureでもaudit bytesが変化し上流契約に違反する。caller familyごとにtelemetry sinkがstderr等の非永続出力であることを固定するか、全永続auditのbefore／after bytes一致を維持し、例外が必要ならrequirementsで承認する必要がある。
- postcondition不成立を専用internal invariant errorへ送る方針は示されたが、その型とtransportが成果物間で閉じていない。setter signatureは依然 `TextMutationResult` のみで、business-logic-modelのcaller手順はnot-found／validationだけを明示処理する一方、domain-entitiesのTyped caller failureと `MutationTransaction.failed` もinvariant errorおよびduplicate-target failureを列挙していない。このままでは例外が既存JSON error boundaryを迂回する実装が成立する。専用error型、setterからのthrow／Result規則、全callerのcatch位置、transaction stateへの遷移、failure-injection用parser／renderer seamを一貫して定義する必要がある。
