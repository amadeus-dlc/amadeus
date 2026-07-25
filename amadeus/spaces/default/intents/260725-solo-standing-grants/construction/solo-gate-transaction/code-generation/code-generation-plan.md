# Code Generation Plan: solo-gate-transaction

## Scope

本UnitはU1の認可domainをroute・commit・human fallbackへ接続する。全harness生成と最終distribution回帰はU3へ残す。Test StrategyはComprehensiveを維持する。

## Plan

- [x] **Step 1: directive carrierとtyped fallback schemaを追加する**

  `amadeus-directive.ts`へ`standing_grant_id`＋`standing_grant_route_id`のall-or-none pair、target intent＋Presence Reservation Idを持つtyped await-approvalを追加する。`gate`はboolean/既存unresolvedのまま維持し、他kindのunknown fieldを拒否する。

  Trace: FR-08、FR-10、FR-15–18、TR-08–09、TR-11。

- [x] **Step 2: solo route transactionを実装する**

  `amadeus-orchestrate.ts`で既存gate policy確定後、solo・`gate === true`・eligibleな場合だけU1 candidateを探索する。workspace outer lock→route owner intent lockの順でUUID v4未使用確認とprotected receiptをaudit-first appendし、成功後だけcarrierを返す。team/human-only/per-unit未完では既存directiveを返す。

  Trace: FR-06–09、FR-19–23、TR-01–07。

- [x] **Step 3: grant-backed approval entry pointを実装する**

  `amadeus-state.ts`へexclusive authorization input classifierを追加する。grant branchだけworkspace outer lock→registry-bound receipt owner lockを取得し、owner lock内fresh auditからsame Grant Idを再検証する。success時だけverified Grant Id付き`GATE_APPROVED`→`STAGE_COMPLETED`→state advanceを行う。

  Trace: FR-12–14、TR-15、TR-18–24。

- [x] **Step 4: expected invalidityとstrict wireを実装する**

  expiry、revoke、scope、provenance、receipt 0/複数/field mismatchはexit 0・stderr空・単一exact JSONのawait outcomeとし、approval/completion/error/state delta 0にする。orchestratorはgrant branchだけexit/stderr/stdout exact schemaを検証し、stderr文字列判定を使わない。human/team wireは変更しない。

  Trace: FR-15–17、NFR-01–04、TR-10–14c、TR-16–21。

- [x] **Step 5: presence reservationとtargeted human continuationを実装する**

  `.amadeus-sessions/`にversioned armed→minted→consumed markerをatomic保存する。await directiveは`target_intent_id`＋`presence_reservation_id`を次turnへ明示搬送する。trusted `amadeus-mint-presence.ts`だけが同一sessionのarmed markerからowner `HUMAN_TURN`をexactly once mintし、targeted reportは明示Reservation Id、owner provenance、open gateを検証して既存human approvalを行う。

  Trace: FR-16、FR-18、TR-14d–f、TR-25–26。

- [x] **Step 6: crash/replay recoveryを実装する**

  HUMAN_TURN append後marker更新前はReservation Id exact lookupで0 append／1 reuse／複数fail-closed。approval後consume前はowner approval/completion/state prefixをexact lookupし、既存recovery完了後markerだけを冪等consumeする。

  Trace: NFR-01、NFR-03–04、U2-REL-09–10。

- [x] **Step 7: directive・wire・reservation unit/property testsを追加する**

  新規U2 unit suiteでcarrier matrix、authority union、strict wire corpus、UUID/target validation、reservation transitions、tamper/replay/crash boundaryを検証する。

  Trace: 受け入れ条件1–4、7。

- [x] **Step 8: route/commit/fallback integration testsを追加する**

  success、route後expiry/revoke、substitution、higher-priority grant、issuer mismatch、cursor switch、receipt 0/1/複数、non-owner delta 0、team/invalid carrier、targeted human continuationをsleepなしで検証する。

  Trace: 受け入れ条件1–6、TR-15–26。

- [x] **Step 9: quality ritual・per-unit非再実行testsを追加する**

  carrier routeでもbody/reviewer/sensor/learnings各1回、fallback continuationで増分0、per-unit all-covered最終gateだけが対象となることをcounterとartifact hashで検証する。

  Trace: FR-09、FR-22–23、受け入れ条件6–7。

- [x] **Step 10: focused verificationとsummaryを完了する**

  U1/U2 focused suites、既存team/human regression、typecheck、changed-file lint、`git diff --check`を通し、変更・test・計画差分を`code-summary.md`へ記録する。generator/full distribution/driftはU3で実行する。

  Trace: NFR-05–08、受け入れ条件5、7、9。

## Explicit Non-goals

- standing grant専用gate値
- stderr文字列によるbranch
- team leader/delegationの流用または変更
- generated harness fileの手編集
- remote session store、新database、new config model
