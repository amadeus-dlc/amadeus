# Business Logic Model: solo-gate-transaction

## Design Inputs

本設計は`unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md`を入力とし、U1のgrant authorization domainを利用する。

## Route Workflow

1. engineが既存規則でstage directiveと`gate` booleanを構築する。
2. modeがsolo、`gate === true`、通常approval gate、per-unitならall-covered final gateである場合だけgrant探索へ進む。
3. phase-boundary/walking-skeletonを含むU1 eligibilityでhuman-onlyならcarrierなしの既存directiveを返す。
4. eligible candidateがなければcarrierなしの既存directiveを返す。
5. candidateがあればUUID v4 Route Idを生成し、既存workspace-level intent registry lockを取得する。
6. outer lock内でRoute Idがspace-wide未使用であることを確認し、protected `GATE_AUTHORIZATION_SELECTED`をRoute Id、Stage、Grant Id付きでappendする。衝突時はduplicateを作らずfatalにする。
7. append成功後、`standing_grant_id`と`standing_grant_route_id`をdirectiveへall-or-noneで付ける。
8. append失敗時はcarrierをemitせず、既存fatal I/O errorを返す。

stage body、reviewer、sensor、§13 learningsはcarrier有無に関係なく通常どおり実行する。carrierが省略するのはapproval promptのhuman turnだけである。

## Directive Validation

`run-stage`だけがoptional carrier pairを持てる。

- Grant Id: 8 lowercase hex
- Route Id: UUID v4
- 片方だけ: invalid directive
- 他kindへ付与: unknown-key invalid
- `gate`は既存boolean/未解決契約のままで、新しい値を追加しない

`await-approval`は`kind`、`stage`、固定reason、receipt ownerのregistry UUIDである`target_intent_id`、UUID v4の`presence_reservation_id`だけを持ち、unknown fieldを拒否する。target UUIDはcanonical UUIDv7 shapeで、current spaceのregistryにexactly one、status `in-flight`として存在し、receipt owner recordへ解決できることをmutation前に検証する。path、record dir、alias、別space UUIDは受理しない。target IDとReservation Idは認可証拠ではなく、fallback後のhuman commitをactive cursorから分離し、同じreservationへ相関するopaque carrierである。

## Report Transport

grant carrier付き`report`だけがstate approveへ次の2 flagをverbatimで渡す。

- `--standing-grant-id`
- `--standing-grant-route-id`

2 flagはall-or-noneである。human/team report branchは既存argument、stdout、stderrを変えない。

authorization inputの組合せは次で固定する。

| Human input | Carrier pair | Outcome |
|---|---|---|
| あり | なし、targetなし | 既存human/team path |
| あり | なし、valid target IDとmint済みsession reservationあり | fallback後のtargeted human path。owner ledgerのfresh human guardを維持 |
| なし | あり | grant-backed path |
| あり | あり | mutation前のprotocol error。暗黙にどちらかを優先しない |
| なし | なし | 既存human/team pathへ渡し、既存human-presence/team authorization guardが判定 |
| 任意 | partial/malformed pair | mutation前のprotocol error |

入力行列はlock取得前に分類する。workspace outer lockとowner intent inner lockはfull grant carrier pairのbranchだけに適用し、carrier/targetなしの既存human/team branchには適用しない。targeted human branchは指定owner intentの既存intent lockだけを取得する。

state process終了後、grant-backed branchだけをstrict parserへ渡す。

| State process result | Report outcome |
|---|---|
| exit 0、stderr空、単一JSON `{"kind":"approved"}` | 既存done |
| exit 0、stderr空、単一JSON `await-approval` exact shape（owner `target_intent_id`を含む） | 同じtarget IDと新規Reservation Idを持つtyped `await-approval` directive |
| exit 0だがstderrが1 byte以上 | protocol error directive |
| exit 0だが空/複数行/非JSON/unknown key/kind | protocol error directive |
| nonzero exit | 既存fatal error directive |

stderrの文字列内容でbranchしない。

## Approval Transaction Entry Points

lock取得前のexclusive unionごとに、独立したentry pointを使う。

### Grant-backed solo

1. workspace-level intent registry lockをouterとして取得し、space-wide exact receipt lookupからtransaction完了まで保持する。
2. space-wide snapshotではreceipt cardinalityとownerだけを決め、grant projectionを保持・再利用しない。
3. exactly oneのreceipt所有intentをpinし、workspace → owner intentの順でinner audit/state lockを取得する。
4. owner lock取得後にowner auditをfresh readし、既存state、stage、artifact、scope、Route Id receiptを再検証する。
5. canonical modeがsoloであること、receiptのStageとGrant Idがcarrierと一致することを検証する。
6. 同じfresh owner auditからU1 exact-ID validationを行い、同じGrant Idを現在時刻に対して再検証する。
7. receipt/grantがno-longer-authorizesならapproval/completion/error auditとstate mutation前にfallback outcomeを返す。
8. validならverified Grant Idをapproval authorizationへ入れ、既存artifact verification後のapproval transactionで`GATE_APPROVED`、`STAGE_COMPLETED`、state write/advanceを実行する。

`GATE_APPROVED.Grant Id`はstep 6で検証したIDと完全一致する。後発grantへ差し替えない。space-wide lookup完了後・owner lock取得前にrevokeをappendするbarrier fixtureでfallbackを保証する。

### Targeted human continuation

registryでtarget UUIDをexactly-one in-flight ownerへ解決し、そのowner intentの既存lockだけを取得する。明示されたReservation Idのmarker、owner ledger上の同じReservation Idを持つfresh `HUMAN_TURN`座標、stage/open gateを検証し、既存human approval transactionを実行する。workspace lock、receipt lookup、grant validationは実行しない。target UUIDだけ、またはsession IDだけからreservationを探索しない。

### Normal human/team

carrierもtargetも持たない既存entry pointをそのまま使用する。workspace lock、receipt owner lock、reservation lookupを追加しない。

### Transaction target and intent races

grant-backed transactionは、workspace outer lock内でRoute Idをspace内の全intent・全audit shardからexact lookupし、exactly oneのreceipt所有intentをtargetへpinする。outer lockはtransaction完了まで保持するため、同じRoute Idの別intent receiptを判定後へ追加できない。targetのstate/artifact/inner lockだけを使用し、report時のactive cursorが別intentを指していても新intentを読取・fallback・audit・state mutationの対象にしない。

receiptが0件または複数intent/複数shardで一致する場合はtargetを選ばずmutation前にfail-closedにする。exactly oneならreceiptのStage/Grant Idをcarrierへ照合し、そのtargetに対してgrant issuer-intent bindingを検証する。不一致は`no-longer-authorizes`としてtargetの同じgateへhuman fallbackする。

carrierがteam modeまたはinvalid modeのdirect state CLIへ提示された場合はmutation前のprotocol errorとする。team authorizationへcarrierを落として続行せず、invalid modeをsolo扱いしない。

## Expected Fallback Workflow

state processはexit 0、stderr空、stdout単一JSONの`await-approval`を返す。reportはこれをerrorとしてemitせず、同じstage、固定reason、receipt owner `target_intent_id`、新規UUID v4 `presence_reservation_id`のdirectiveへ変換する。同時に、host adapterがtrusted hook envelopeから得た実session IDを正規化・digest化し、target UUID、space、stage、Route Id、Reservation Id、状態`armed`を既存gitignored `.amadeus-sessions/` runtime領域へatomic writeする。session IDをuser flag、PID、共有current-session marker、active cursorから推測しない。

Reservation Idはturnをまたいでdirectiveに明示的に保持し、次のreportへ`--presence-reservation-id`としてverbatim forwardingする。これは認可値ではなく、stateがsession-local storeを列挙せずexact markerを選ぶための相関値である。欠落、malformed、target/stage不一致、marker 0件/複数件はmutation前のprotocol errorとする。

conductorは次を再実行しない。

- stage body
- per-unit body
- reviewer
- sensor
- §13 learnings

既存artifactとcurrent stageを保持し、通常のnumbered human approval promptだけを提示する。次の同一sessionの実human promptでUserPromptSubmit trusted writerは、machine-injected分類を先に行い、`armed` reservationのUUIDをregistryから再解決する。exact targetがin-flightならowner intent auditへprotected `HUMAN_TURN`をappendし、監査座標付き`minted`へatomic updateする。別session、machine injection、invalid/ambiguous/complete targetはmintもconsumeもしない。

次のfresh human replyはGrant Id/Route Idを認可に使用せず、directiveの`target_intent_id`と`presence_reservation_id`をreportへverbatim forwardingする。trusted UserPromptSubmit hookは自身のhost session IDからそのsessionで唯一のarmed markerを選び、markerのReservation Idをowner `HUMAN_TURN`へ記録してmintedへ遷移させる。stateは明示Reservation Idの`minted` marker、target UUID、space、stage、owner ledger上の同じReservation Idを持つfresh `HUMAN_TURN`座標、open gateを検証し、既存human guardでtarget intentをcommitする。成功後にreservationを消費する。active cursorは変更しない。

owner approval後・reservation consume前にcrashしたretryでは、markerのtarget、stage、Reservation Id、`HUMAN_TURN`座標に相関するowner `GATE_APPROVED`／`STAGE_COMPLETED`とstate advanceをexact lookupする。完了prefixが一意なら新しいapprovalを行わずmarkerだけを冪等に`consumed`へ収束させる。approvalだけ、completionまで、state advanceまでの各prefixは既存recoveryを先に完了し、その後consumeする。相関が0件・矛盾・複数ならfail-closedとし、別reservationのarmや別intent mutationを行わない。

## Audit and State Sequences

### Grant-backed success

1. route: `GATE_AUTHORIZATION_SELECTED`
2. stage quality rituals
3. commit: `GATE_APPROVED` with exact Grant Id
4. `STAGE_COMPLETED`
5. state write/advance

### Expected fallback

route receiptは既存factとして残るが、commit attemptによる`GATE_APPROVED`、`STAGE_COMPLETED`、`ERROR_LOGGED`の増分は0で、current stageは不変である。

### Human continuation

fresh `HUMAN_TURN`を既存guardが検証し、`target_intent_id`からregistry解決したownerの既存順序で`GATE_APPROVED`、`STAGE_COMPLETED`、state advanceを1回だけ行う。`GATE_APPROVED`にGrant Idは付けず、human authorizationとして記録する。

## Per-unit Construction

- uncovered unit directive: `gate === false`、carrierなし、bodyとreviewerを1回実行
- all units covered: final stage directiveの`gate === true`だけがgrant探索対象
- final gate fallback: unit artifactsとreview evidenceを保持し、body/reviewer countを増やさない

## Deterministic Concurrency Scenarios

routeとcommitの間にclock advance、revoke append、higher-priority grant append、grant issuer-intent mismatch、active cursor switch、receipt duplication/mismatchを注入する。active cursor switch fixtureは元receipt所有intentだけがtargetとなり、新intentのapproval/fallback/audit/state deltaが0であることを検証する。sleepを使わず、before/after audit countsとstate bytesを比較する。


## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-25T06:26:16Z
- **Iteration:** 1
- **Scope decision:** none

route/commit/fallbackの主要契約は実装可能だが、active cursor切替、human+carrier混在、非solo carrier、stderr非空の境界が未定義である。

### Findings

- BLOCKER: routeとcommit間のactive intent cursor切替時にどのtransaction target/state/artifactを扱うか未定義。
- MAJOR: human inputとcarrier pairの同時指定を含む認可入力行列がない。
- MAJOR: team/invalid modeでcarrierが提示された場合のoutcomeがない。
- MAJOR: exit 0かつ正しいJSONでもstderr非空のstrict wire分類がない。
- route atomicity、carrier schema、success mutation順序、fallback不変、per-unit分離は確認済み。

## Review — Iteration 2

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-25T06:28:31Z
- **Iteration:** 2
- **Scope decision:** none

3点は解消したが、2-field carrierとactive-intent限定receipt lookupではroute時intent identityを機械的に固定できず、cursor switch時に新intentへfallbackし得る。

### Findings

- BLOCKER: route時intent identityをcarrier/record target/global exact receipt lookupのいずれかで機械的に識別する必要がある。
- issuer-intent mismatchのtyped fallbackは解消。
- human/carrier入力行列は解消。
- team/invalid mode carrierのprotocol errorは解消。
- exit0かつstderr非空のprotocol errorは解消。
