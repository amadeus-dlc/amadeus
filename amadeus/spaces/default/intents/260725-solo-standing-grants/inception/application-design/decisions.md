# Architecture Decisions: Solo Standing Grant

## Design Inputs

ADRは`requirements.md`、`architecture.md`、`component-inventory.md`、`team-practices.md`を根拠とし、Application Design質問Q1〜Q3の人間裁定を反映する。

## ADR-001: Gate RequirementとStanding Grant Carrierを分離する

### Status

Accepted（Q1=A）

### Context

`gate`はworkflow policyを表す。Grant Idをpseudo gate値にすると、gateの存在と認可源が再結合し、phase boundaryやwalking skeletonの適用規則が崩れる。

### Decision

`gate`を変更せず、solo routeがgrantを選択したときだけ`run-stage.standing_grant_id?: string`と`standing_grant_route_id?: string`のpairを付与する。reportは対応flag pairで同じ値を運ぶ。

### Consequences

- Positive: team modeの既存directiveは不変、exact-ID相関が明示的
- Negative: carrierはstanding grant専用であり、将来の他認可源には別設計が必要
- Reversibility: 高い。optional fieldとCLI flagを削除すれば戻せる

### Alternatives Rejected

- nested `gate_authorization`: 今回にはschema/transportが過剰
- 全mode汎用authorization union: team modeの公開契約を不必要に変更
- opaque token: local audit再検証に不要
- commit-only再探索: route選択との同一性を失う

## ADR-002: Grant失効を`await-approval` Directiveで表す

### Status

Accepted（Q2=A）

### Context

routeとcommitの間の失効・取消は予期された競合であり、実行errorではない。既存`error` directiveは`ERROR_LOGGED`を発生させるため利用できない。

### Decision

`{ kind: "await-approval", stage, reason }`をdirective unionへ追加する。これは既存gateをprompt-onlyで再提示し、stage body、reviewer、sensors、learningsを再実行しない。

### Consequences

- Positive: expected fallbackと真正errorが型で分離される
- Negative: 全harness conductorに新しいdirective caseが必要
- Reversibility: 中。公開directive contractとして配布後は互換性を考慮する

### Alternatives Rejected

- `run-stage.resume_at`: stage executionとapproval resumeが同じkindに混在
- `done.approval_required`: terminalと未完了が矛盾
- 専用exit code: process transportへdomain outcomeが漏れる
- `error`:監査不変条件に反する

## ADR-003: 既存3境界へ責務を配置する

### Status

Accepted（Q3=A）

### Context

既存コードはaudit queryを`amadeus-lib.ts`、routingを`amadeus-orchestrate.ts`、atomic transitionを`amadeus-state.ts`が所有する。soloにはleaderがいない。

### Decision

Grant Domainをlib、route/report transportをorchestrate、lock内commitをstateへ置く。新serviceは作らず、team delegationを流用しない。

### Consequences

- Positive: 最小変更、既存lockとaudit protectionを再利用
- Negative: 既に大きい3fileへ限定的な責務追加が入る
- Reversibility: 高。各public seamが独立している

### Alternatives Rejected

- 新service: transaction ownerが分裂し、単一featureには過剰
- delegation再利用: leader不在と`DELEGATED_APPROVAL`禁止に反する
- orchestrate集約: lock外判定になりTOCTOUを閉じない
- snapshot運搬: revocation/expiryを再評価できない

## ADR-004: Exact-ID RevalidationをMutation前のLock内で行う

### Status

Accepted

### Context

route時の有効性はcommit時の有効性を保証しない。別grantへの差替えは監査相関を壊す。

### Decision

state lock内で、carrierのIDに一致する発行eventだけをlookupし、expiry、revocation、intent、provenance、gate coverageを再評価する。invalidなら一切mutationせず`await-approval`を返す。新しいgrantが存在しても差し替えない。

### Consequences

- Positive: TOCTOUとGrant Id監査相関を閉じる
- Negative: approval transaction内でaudit全体を再読する
- Reversibility: 高。read-only query seam

### Alternatives Considered

- current active grant再探索: IDが変わり得るため不採用
- lock外precheckのみ: race windowが残るため不採用

## ADR-005: Solo CandidateはIntent-bound完全順序、Team探索は不変

### Status

Accepted（Requirements Q1=A）

### Context

現行team探索は最大expiryを優先するが、同一expiryの完全なtie-breakを公開契約として持たない。solo grantはactive intentへbindingされる。

### Decision

solo routeだけに、expiry降順、`GRANT_ISSUED.Timestamp`降順、Grant Id辞書順昇順を適用する。teamの`findActiveStandingGrant`は変更しない。

### Consequences

- Positive: fixtureとclockが同じなら常に同じID
- Negative: mode間でcandidate poolとtie-breakが異なる
- Reversibility: 中。外部観測可能なsolo契約

### Alternatives Considered

- 同率human fallback: 有効grantがある受け入れ条件を満たさない
- team探索も同時変更:非回帰境界に反する

## ADR-006: Policyを認可より先に評価する

### Status

Accepted

### Context

phase boundary、walking skeleton、per-unit final gateはgate policyであり、standing grant policyではない。

### Decision

現行gate requirementを先に確定し、`gate === true`のdirectiveだけでgrantを選択する。shared gate classifierがphase boundary、実効walking-skeleton stance、all-units-coveredを判定する。project scope overrideも対応canonical scopeと同じ実効stanceへ解決する。

### Consequences

- Positive: grantがgateを作成・消去しない
- Negative: scope overrideとcanonical分類の同期testが必要
- Reversibility: 低。安全不変条件として維持する

### Alternatives Considered

- grant側で独自gate分類: policy driftを生むため不採用
- grant専用gate enum:明示的禁止事項

## ADR-007: Canonical Coreから全Harnessへ同一意味論を投影する

### Status

Accepted

### Context

directiveとconductor手順は6 harnessで同じ意味を持つ必要がある。

### Decision

core directive/state/protocolを正本とし、Grant Id / Route Id pairのforwardingと`await-approval` handlingをpackage生成する。generated copyは手編集しない。

### Consequences

- Positive: harness間driftをbuild時に検出
- Negative: 小さなcore変更でも6 harnessの生成差分が発生
- Reversibility:既存packagerで管理可能

### Alternatives Considered

- harness個別実装:意味論driftを生むため不採用

## ADR-008: Route選択をProtected Audit Receiptで相関する

### Status

Accepted

### Context

optional Grant Id carrierだけでは、report callerが別の有効IDへ差し替えたことをcommit processが証明できない。新しい設定/state fieldは禁じられており、NFR-03は差替えをfail-closedにする。

### Decision

solo routeはUUID v4 Route Idを生成し、carrier emit前に`GATE_AUTHORIZATION_SELECTED`を`Route Id`、`Stage`、`Grant Id`付きで監査へ記録する。このeventをprotected mint対象とする。commit lockはRoute Idをexact lookupし、active intent内で1件だけ存在し、stage/Grant Idがcarrierと一致することを確認した後、exact-ID validityを再検証する。receiptはimmutable factであり、latest/consumed推論を行わない。

### Consequences

- Positive: 新設定なしでroute/commit同一性を機械的に強制できる
- Negative: grant-backed routeごとに監査eventとoptional Route Id fieldが増え、routeは完全なread-onlyではなくなる
- Neutral: fallback時も過去の選択receiptは残るが、`ERROR_LOGGED`、`GATE_APPROVED`、`STAGE_COMPLETED`は増えない
- Reversibility: 中。監査consumerとの互換性を保って廃止する必要がある

### Alternatives Considered

- carrierを信頼するだけ: substitution fixtureをfail-closedにできない
- state fieldへ保存: 明示的制約に反する
- opaque token: key管理または新設定が必要
- commit時のbest candidate再探索: route後に別grantが増えた場合に元IDを正しく検証できない

## ADR-009: Grant-backed ApproveにStrict JSON Wireを使う

### Status

Accepted（Architecture Review Iteration 1 remediation）

### Context

orchestrate reportとstate approveはprocess境界であり、TypeScript unionだけではfallback contractにならない。team/human approveの既存CLI出力は変えられない。

### Decision

新しいgrant flag pairを持つapproveだけ、exit 0・stderr空・stdout正確に1 JSON objectで`approved`または`await-approval`を返す。reportがstrict parserとdirective変換を所有する。exit 0でも空、複数行、非JSON、unknown shapeはprotocol errorである。

### Consequences

- Positive: 全harnessが同じtyped outcomeを受け、stderr文字列判定が不要
- Negative: grant-backed branchに専用wire parser testが必要
- Neutral: human/team approveの既存stdout/stderrは不変
- Reversibility: 中。公開CLI flag利用者との互換性が必要

### Alternatives Considered

- exit codeのみ: domain reasonを表現できない
- stderr sentinel: 明示的禁止
- 全approve出力変更: team互換性に反する

## ADR-010: Operating ModeをCanonical ResolverでFail-closedにする

### Status

Accepted（Architecture Review Iteration 1 remediation）

### Context

`!== "team"`は未知値をsolo扱いする。routeとcommitのmode判定が異なるとauthorizationが非対称になる。

### Decision

未設定/空=`solo`、`solo`=`solo`、`team`=`team`、その他=invalidのresolverを共有し、発行・取消・route・commitの全境界で利用する。

### Consequences

- Positive: 未知modeで自動認可しない
- Negative: 従来たまたま通っていた不正値はloud refusalになる
- Reversibility: 高。pure resolver

### Alternatives Considered

- 非teamをすべてsolo: fail-openのため不採用

## ADR-011: Route IdのReceipt所有IntentへTransactionをPinする

### Status

Accepted（2026-07-25T06:37:48Z Functional Design user gate）

### Context

route後・commit前にactive-intent cursorが同名stageを持つ別intentへ切り替わると、active intent内だけのreceipt lookupでは新intentを誤ってfallbackまたはmutation対象にし得る。一方、carrierへintent fieldを追加すると既承認の2-field契約と全harness surfaceが広がる。

### Decision

Route Idをspace内の全intent・全audit shardからexact lookupし、exactly oneの`GATE_AUTHORIZATION_SELECTED`所有intentをtransaction targetへpinする。route receipt appendとcommit lookupは既存workspace-level intent registry lockを共有し、commitはそのouter lockをtransaction完了まで保持する。state/stage/artifact/grantの検証とmutationはworkspace → receipt owner intentの順で取得したinner lockのtargetだけに行い、現在のactive cursorが指す別intentにはapproval、fallback、audit、state mutationを一切行わない。Grant Id＋Route Id carrierは維持する。

### Consequences

- Positive: carrier拡張なしでroute時intentを監査receiptから機械的に復元できる
- Positive: cursor切替時も新intentを誤操作しない
- Positive: 同一Route Idのcross-intent receipt追加がexactly-one判定後へ割り込めない
- Negative: receipt lookup範囲がactive intentからspace全intentへ広がる
- Negative: grant-backed route/commitは短時間workspace-levelに直列化される
- Mitigation: Route Id UUID v4のexact matchだけを走査し、lock順序をworkspace → owner intentへ固定する。0件・複数件・field不一致はmutation前にfail-closed

### Alternatives Considered

- Intent Idをcarrierへ追加: 明示的だがdirective/flags/全harness contractが拡大する
- record targetをcarrierへ追加: filesystem detailを公開carrierへ漏らす
- active intentを信頼: 同名stage競合を検出できず不採用

## ADR-012: Fallback Human ApprovalへReceipt Owner Targetを保持する

### Status

Accepted（NFR Requirements、ユーザーの包括指示「質問は全部推奨」により推奨案を採用）

### Context

grant-backed commitがtyped fallbackした後、認可主体はhumanへ戻る。しかしactive cursorが別intentを指す場合、carrierなしの通常reportだけでは元のreceipt ownerを復元できず、同名stageを持つ非owner intentを誤操作し得る。

### Decision

`await-approval` directiveにreceipt ownerのregistry UUIDをopaque `target_intent_id`として含める。fallback時にhost session ID keyedのpresence reservationを既存gitignored `.amadeus-sessions/`へarmし、次の同一sessionの実human promptだけをtrusted UserPromptSubmit writerがowner intentの`HUMAN_TURN`へmintする。fresh human reply時は`report --target-intent-id`からstate approvalへUUIDをverbatim forwardingし、current-space registry exactly-one/in-flight、reservation、owner HUMAN_TURN provenance、target stage/open gateを再検証する。target/reservationは認可証拠ではなくtransaction targetであり、Grant Id/Route Idをhuman authorizationへ流用しない。active cursorは変更しない。

### Consequences

- Positive: cursor switch→fallback→human continuationの全経路でowner intentだけを操作する
- Positive: run-stageのGrant Id＋Route Id carrier契約を維持する
- Negative: fallback directive/report/stateにtarget field/flagとsession-local reservationが増える
- Mitigation: opaque UUID、registry exact resolution、session-keyed one-shot状態、target stage/open-gate/provenance validationでfail-closedにする

### Alternatives Considered

- active cursorをownerへ書換え: concurrent sessionのambient contextを変更するため不採用
- run-stage carrierへIntent Id追加: grant routeの公開surfaceを広げるため不採用
- Route Idをhuman認可へ再利用: 認可源とtransaction targetを混同するため不採用
