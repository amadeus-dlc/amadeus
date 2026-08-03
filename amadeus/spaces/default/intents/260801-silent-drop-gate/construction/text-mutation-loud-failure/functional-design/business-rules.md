# Business Rules — text-mutation-loud-failure

## 適用範囲と上流トレーサビリティ

本規則は `unit-of-work.md` の U2、`unit-of-work-story-map.md` の SC-06、`requirements.md` の FR-04／11／15・NFR-03／05／06／09、`components.md` の R1／R2、`component-methods.md` のvalidation／mutation API、`services.md` の既存runtime境界に適用する。

対象はcanonical state parser、`ValidatedStageState`、`setCheckbox`、`setStageSuffix`、全callerのresult消費である。静的detector、CI、ledger、mirror state storeは対象外とする。

## Validation規則

| ID | 規則 | 不変条件 |
|---|---|---|
| BR-TM-01 | setterはraw stringを受け取らない | input typeはopaque `ValidatedStageState` |
| BR-TM-02 | stage slugはcanonical lineちょうど1件 | 0件はsetterの `not-found`、2件以上はvalidation failure |
| BR-TM-03 | malformed section／checkbox／suffixをmutationしない | validation failure、bytes不変 |
| BR-TM-04 | validation済みindexとoriginal bytesを結合する | 別documentのindexを再利用できない |
| BR-TM-05 | mutation後contentを再parseする | target postconditionとdocument全体のvalidityが必須 |
| BR-TM-06 | 非対象stage identityを変更しない | before／afterの非対象projectionが一致 |

target slugがvalidation済みdocumentの既知stage集合に存在しない場合だけ `not-found` へ進む。duplicateやmalformedを `not-found` に畳まない。

## Mutation outcome規則

`TextMutationResult` は `changed | not-found` の閉集合とする。

| Result | 意味 | content |
|---|---|---|
| `changed` | targetが一意に存在し、返却contentの期待postconditionが成立 | 変更後bytes。既に期待値ならoriginalと同一 |
| `not-found` | valid documentにtarget slugが0件 | contentを持たず、診断用targetを持つ。input original bytesは別途不変 |

- `changed` は物理差分ではなくoperation成立を表す。
- already-setを第3variantやwarningへ分けない。
- `not-found` は `{ kind: not-found, target }` の上流shapeを維持する。
- setterはthrowを正常分岐に使わない。
- mutation後reparse／postcondition不成立は正常分岐ではなく `StateMutationInvariantError(code, target, operation, reason)` をthrowする。R2 transaction boundaryはこの型だけをcatchして `MutationTransaction.failed(invariant)` へ遷移させ、未知のexceptionは外側の既存internal error boundaryへ再throwする。

## Checkbox／suffix規則

### Checkbox

- targetのcheckbox markerだけを期待stateへ設定する。
- target lineのslug、suffix、説明textを変更しない。
-既に期待stateならbytesを維持した `changed` とする。
-再parse後にtarget markerが期待stateでなければfailureとする。

### Suffix

- targetのsuffixだけを `EXECUTE | SKIP` へ設定する。
- target lineのslug、checkbox、説明textを変更しない。
-既に期待suffixならbytesを維持した `changed` とする。
- unknown suffixや複数suffixを受理しない。

## Caller副作用規則

| ID | 規則 |
|---|---|
| BR-CALL-01 | 全callerは `changed`／`not-found` をexhaustiveに分岐する |
| BR-CALL-02 | `not-found` は既存typed CLI errorへ昇格する |
| BR-CALL-03 | validation／not-found／duplicate-target／invariant時のstateと全永続audit bytesは呼出前と同一。診断はstderrだけへ出す |
| BR-CALL-04 | failure時のsuccess JSON／success messageは0件 |
| BR-CALL-05 | retry／暗黙resyncは0回 |
| BR-CALL-06 | bytes差分がある `changed` はatomic write成功後だけsuccessを通知する |
| BR-CALL-07 |同一bytesのidempotent `changed` は不要な物理writeを行わない |
| BR-CALL-08 | failure診断をworkflow auditへappendしない |
| BR-CALL-09 | transaction boundaryは `StateMutationInvariantError` だけを型guardでcatchし、未知のexceptionは変換せず再throwする |

stderr診断は許可するが、warning-only successにはしない。将来retry／resyncを認可する変更はscope changeと人間承認を必要とする。

## Bulk transaction規則

1. original documentを1回validateする。
2. `slug + dimension` のtarget keyを全件検査し、重複keyは同値／相反を問わずtyped duplicate-target failureにする。同slugのcheckboxとsuffixは別keyである。
3. unique mutationをtarget keyのbyte順でin-memory適用する。
4. 各resultを次step前に検査する。
5. 1件でもfailureなら全中間contentを破棄する。
6. final documentを再parseし、全target postconditionを検証する。
7. atomic writerを最大1回呼ぶ。
8. mutation audit／successはwrite成功後にだけ実行する。

bulk操作が部分成功を返してはならない。target順序によってfinal bytesやfailure kindが変わらないよう、slug／operation orderを固定する。

## Caller error mapping規則

| Caller family | validation／not-found／invariant／write failure |
|---|---|
| jump |既存jump error boundary、stderr `{"error": message}`、exit 1、stdout／jump success JSON／mutation auditなし |
| utility compose／set-status |既存`die` boundary、stderr `{"error": message}`、exit 1、stdout／success JSON／mutation auditなし |
| state transaction／gate／Bolt merge |既存state error boundary、stderr `{"error": message}`、exit 1、stdout／success JSON／mutation auditなし |

not-found messageはtargetを含み、validationは既存validator message、postcondition不成立はinternal invariant messageを用いる。top-level JSON fieldとexit codeを追加しない。failure診断はstderrだけへ出し、error telemetryを含む永続audit writerを呼ばない。

## Caller coverage規則

次の経路を全てmigration対象とし、未検査resultを残さない。

- `amadeus-jump.ts`: skip、reset、target start。
- `amadeus-utility.ts`: compose scope suffix flip、set-status。
- `amadeus-state.ts`: bulk checkbox、advance、phase／final completion、gate start／approve／reject／revise／skip、Bolt fragment merge。

callsite inventoryはcanonical sourceのsymbol参照で検証し、generated projectionを正本として数えない。

## Compatibility規則

-既存state document grammarとserialization bytesを、対象mutation以外で変更しない。
-既存CLI success／error shapeを維持し、新しい公開variantを追加しない。
- idempotent setの既存成功意味を維持する。
- canonical sourceだけを編集し、generated harnessを直接編集しない。
- package／promotion regenerationとbyte parityは後続Unitで検証する。

## Acceptance規則

| ID | 証跡 |
|---|---|
| AR-TM-01 | malformed／duplicateがsetter前にtyped failureとなる |
| AR-TM-02 | absent targetが `not-found`、state／全永続audit bytes不変となり、診断がstderrだけへ出る |
| AR-TM-03 | already-set targetが同一bytesの `changed` となる |
| AR-TM-04 | checkbox／suffix変更後のreparseと非対象bytes不変を検証する |
| AR-TM-05 | 全callerでfailureがwrite／audit／successより先にreturnする |
| AR-TM-06 | bulk途中failureでpartial write／auditが0件になる |
| AR-TM-06A | bulk duplicate target keyを同値／相反の双方で適用前に拒否する |
| AR-TM-07 | retry／resync call countが0になる |
| AR-TM-07A | caller family別にstderr `error` JSON、exit 1、stdout／successなしを固定する |
| AR-TM-07B | parser／renderer seamによるpostcondition failure injectionが `StateMutationInvariantError` → `MutationTransaction.failed(invariant)` となり、write／全永続audit／successが0件になる |
| AR-TM-08 | focused unit／integration、lint、typecheckがgreenになる |
| AR-TM-09 | canonical source以外を直接変更していない |

証跡は後続 `repository-adoption` が#1874 identity削除、全体回帰、distribution driftと統合できる形式で残す。
