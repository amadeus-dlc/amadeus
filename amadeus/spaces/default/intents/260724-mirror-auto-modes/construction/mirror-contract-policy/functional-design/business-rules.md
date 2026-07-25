# Business Rules — mirror-contract-policy

> 上流入力（consumes 全数）: `unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md`

## Rule Sources

`unit-of-work.md`のUnit 1、`unit-of-work-story-map.md`のAS-01／03／04／05、`requirements.md`の三モードとFR-10、`components.md`のC0〜C2、`component-methods.md`のunion／function contract、`services.md`のboundary sequenceを正本とする。

## Configuration Rules

| ID | Rule |
|---|---|
| CP-C01 | `auto-mirror`のvalid valueは厳密な文字列`off | prompt | auto`だけ |
| CP-C02 | 未指定時は`prompt` |
| CP-C03 | precedenceはGlobal < Space < Intent |
| CP-C04 | boolean `true`／`false`を文字列へ変換しない |
| CP-C05 | 1件でもinvalidならresolved configを返さず全issueを返す |
| CP-C06 | diagnosticはlayer、path、key、actual type、expected valuesを含む |
| CP-C07 | C1はconfigをread-onlyで収集し、schema／precedenceはpure parserだけが判断する |

## Mode Rules

| Mode | create | sync | close | Pending retry |
|---|---|---|---|---|
| `off` | suppress | suppress | suppress | 保持してsuppress |
| `prompt` | eventごとに確認 | eventごとに確認 | eventごとに確認 | retryを確認 |
| `auto` | guard通過時execute | guard通過時execute |全guard通過時execute | 自動retry |

`auto`はcreate／sync／closeだけへのstanding consentであり、PR、merge、release、publish、deploy、repairを許可しない。

manual boundaryはCLI invocation自体を単一operationへの明示同意として扱う。C2はmanual create／sync／closeをmodeなしで`execute`へ決定し、C6がprovenance、repository、landing、final-sync guardを必ず適用する。repairはone-time human challengeを追加で必要とする。

## Boundary Applicability Rules

| Boundary | Applicable operation |
|---|---|
| Intent Capture approval | Issueなしならcreate |
| Phase verification | Issueなしならcatch-up create、Issueありならsync |
| Park committed | Issueなしならcatch-up create、Issueありならsync |
| Workflow completion | create→final sync→close |
| Manual CLI | 明示された単一operation |

phase／parkのsyncにlanding checkは不要だがprovenance／repository一致は必要である。completionのfinal syncはlanding check通過後だけ適用する。

## Event and Skip Rules

| ID | Rule |
|---|---|
| CP-E01 | event keyはIntent、boundary kind、boundary instance、operationで一意 |
| CP-E02 | 同じboundary再入では同じevent key |
| CP-E03 | `prompt`のskipは当該event keyだけに有効 |
| CP-E04 | 同じevent keyのskip後は再質問しない |
| CP-E05 | 別boundary instanceでは新eventとして再評価 |
| CP-E06 | skipはfailure attempt／warningに数えない |
| CP-E07 | skipは既存warningを消さない |
| CP-E08 | receipt keyはversioned `mirrorEventKey`だけで生成する |

## Completion Rules

| Precondition | Decision | Downstream |
|---|---|---|
| 当該completionのcreate receiptなし＋Issueなし | create | 成功時だけsyncを再評価 |
| current receipt=`prepared | attempted | pending` | 同じoperation | reconcile／retry後に再評価 |
| create skip／failure／blocked | terminal | sync／closeなし |
| Issueあり＋landing／ownership valid | final sync | 成功時だけcloseを再評価 |
| final sync skip／failure／blocked | terminal | closeなし |
| final sync成功 | close | guard通過時のみ |
| close skip | terminal | Issueをopenで保持 |

`prompt`は各operationを別々に確認し、`auto`はcoordinatorが最大3回policyを再評価する。policy自身はloopしない。

## Invariants

- `MirrorMode`に第4の値を追加する場合、config parser、decision matrix、status、docsを同じ変更で更新する。
- `MirrorOperation`は`create | sync | close`だけであり、generic actionへ拡張しない。
- invalid configと`off`はoperation receiptのattempt countを増やさない。
- blocked reasonをretryable GitHub failureへ変換しない。
- provenance／repository／landing／candidate guardはC2で判断せず、C6の全operation共通preconditionとする。
- decisionはstateを変更せず、同じinputから同じoutputを返す。
- lifecycle inputはmodeと生成済みeventを必須とし、manual inputはmodeを持たない。
- completion selectorは現在のworkflow completion instanceと一致するreceiptだけを参照する。
- unknown union variantはfail-fastし、暗黙の`prompt`へfallbackしない。

## Acceptance Scenarios

1. 未指定configをresolveすると`prompt`になる。
2. Intent layerにboolean `true`があるとconfiguration issueになり、create decisionは生成されない。
3. `off`かつpending syncでも`suppress: off`になる。
4. 同じcompletion eventでcreate成功後に再評価するとsync、sync成功後はcloseになる。
5. create skip後の同じcompletion eventではcreateを再提示せず、sync／closeも返さない。
6. distinct phase boundaryでは前boundaryのskipに関係なく現在modeで再評価する。
7. mode=`off`でもmanual create invocationはguard通過時にexecuteを返す。
8. completion Aのcreate skipはcompletion Aの後段を抑止するが、completion Bのcreate評価を抑止しない。
9. attempted createが残るcompletionへ再入するとcreate operationを返すが、C6は新規createせずcandidate reconciliationを行う。
