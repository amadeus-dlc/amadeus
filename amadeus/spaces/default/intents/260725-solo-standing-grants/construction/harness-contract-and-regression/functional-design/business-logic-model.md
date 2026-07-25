# Business Logic Model: harness-contract-and-regression

## Design Inputs

本設計は`unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md`を入力とし、U1/U2の確定contractを全harnessへ投影・検証する。

## Canonical Projection Workflow

1. U2のroute-intent bindingは「space-wide exact Route Id lookupからreceipt所有intentへpin」としてFunctional Design user gateで承認済みである。この最終contractをprojection schemaの入力とする。
2. harness-neutral coreとcanonical conductor skill/protocolだけを変更する。
3. generatorがClaude、Codex、Cursor、Kiro、Kiro IDE、OpenCodeのprojectionを生成する。
4. 各projectionから次のsemantic markersを検証する。
   - U2最終contractから導出したroute authorization correlation
   - grant-backed report
   - strict typed `await-approval`
   - opaque `target_intent_id`、`presence_reservation_id`とsession-local presence reservation
   - trusted UserPromptSubmitによるreceipt owner `HUMAN_TURN` mint
   - stage quality ritual非省略
   - fallback時prompt-only human reentry
   - team/human既存path非変更
5. generated fileのmanual diffがあればdrift failureとする。

Grant Id/Route Id pairを維持し、space-wide exact receipt ownership lookupをcanonical coreへ実装する。U3はこの決定をschema、flags、validators、goldens、6 harnessへ投影し、独自補完しない。

### Identity Sources

- intent identityは既存`intents.json` rowのUUIDv7である。intent birth時に1回発行され、record renameやactive cursorから独立し、再利用しない。
- targeted continuationはcurrent spaceのregistryでUUIDがexactly oneかつ`in-flight`のrowへ解決できる場合だけ進む。`complete`、`archived`、欠落、重複、別spaceはfail-closedである。
- host session identityはharness adapterがUserPromptSubmit payloadから渡す。Claudeは`session_id`、Codexはadapter-normalized `session_id`、Cursorは`session_id`、Kiro CLIは`session_id`を使用する。
- Kiro IDEは現adapterにstable session identityがなく、OpenCodeは現packageにtrusted prompt adapterがない。両harnessはhost-native stable identity adapterを実装・fixture化するまでtargeted continuationを完了扱いにしない。欠落時にworkspace共通key、PID、active cursorを代用せずmutation 0でfail-closedにする。

session IDは既存path normalizationと同じ規則で正規化し、reservation file名にはSHA-256 digestだけを使う。空値、正規化後空値、再起動後に安定しない値は拒否する。

## Conductor Workflow Contract

全harnessは次の同一sequenceを表現する。

1. `run-stage`のgate policyを実行する。
2. eligible solo grant carrierがある場合もbody/reviewer/sensor/learningsを完了する。
3. approval promptを出さず、carrier pair付きreportを1回実行する。
4. `approved`なら通常stage completionへ進む。
5. `await-approval`ならopaque owner target IDとReservation Idを保持し、同じstageのhuman promptだけを提示する。
6. fallbackではbody/reviewer/sensor/learningsを再実行しない。
7. 同一host sessionの実human responseをtrusted hookがowner auditへmintする。
8. target ID＋Reservation Id付き・grant carrierなしreportをowner intentの既存human approvalへ渡す。

Codexだけはnumbered prose、他harnessはnative question mechanismを使い得るが、gate authorizationとaudit semanticsは同じである。

## Presence Reservation State Machine

| Current | Actor / condition | Next | Effects |
|---|---|---|---|
| none | reportがexpected fallbackを受け、target/host sessionを検証 | armed | version、Reservation Id、session digest、space、target UUID、stage、Route Id、created timestampをatomic write |
| armed | 同一sessionのtrusted prompt adapterが実human promptを受信 | minted | owner auditへ`HUMAN_TURN` exactly 1（Presence Reservation Id付き）、監査座標をatomic record |
| armed | machine injection、別session、invalid target | armed | audit/runtime delta 0 |
| minted | duplicate/replayed prompt hook | minted | `HUMAN_TURN` delta 0 |
| minted | 明示Reservation Id/target/stage/provenance一致のhuman approval成功 | consumed | owner approval後にconsumedをatomic記録 |
| minted | report crash/fatal validation | minted | approval mutation 0、同じhuman reportをretry可能 |
| any | targetが非in-flight/registry不正 | invalid | mint/approval 0、markerを隔離してfail-closed |

crashがowner `HUMAN_TURN` append後・marker update前に起きた場合、hookはowner auditのPresence Reservation Id exact matchを再読し、1件なら`minted`へ回復し、2件以上ならfail-closedにする。session restartは同じhost session IDならreservationを維持する。Reservation Idはawait directiveから次turnのreportへ明示的にforwardし、stateはtarget/sessionからmarkerを探索しない。時間だけでexpireさせず、successful consumeまたはtarget invalidationだけをcleanup条件にする。同一sessionへ2件目をarmせずfail-closedにする。

hook authenticityは現行`HUMAN_TURN`と同じregistered trusted-hook境界を継承し、本Issueでgeneral CLIやstate CLIへmint APIを公開しない。今回のreservationはhookの既存trust assumptionを強化したと主張せず、general audit CLI拒否、machine-injection classifier、adapter entrypoint regressionを維持する。direct local invocationによる既存hook trust model自体のhardeningは別security intentとし、本機能がそのsurfaceを拡張しないことをblocking差分で確認する。

## Regression Workflow

### Team mode

既存fixtureでleader identity、delegation eligibility、`DELEGATED_APPROVAL`、team standing grant、candidate selection、approve stdout/stderr、`GATE_APPROVED` fieldsをbaseline比較する。solo用完全順序、carrier、strict wireをteam branchへ適用しない。

### Human mode

fresh `HUMAN_TURN` guard、approval prompt、report flagsなし、audit順序、state advanceをbaseline比較する。

### Policy

phase-boundary opt-in、walking-skeleton on/off/effective-on/effective-off/unknown、`amadeus-feature`、per-unit uncovered/all-coveredをtable-driven fixtureで検証する。

### Fallback and intent switching

expiry、revoke、issuer-intent mismatch、receipt mismatchでdirective/state/audit deltaとquality invocation countを検証する。加えてroute後にcursorを同名stageを持つ別intentへ切り替え、typed fallback→同一sessionの実human prompt→opaque target ID＋Reservation Id付きreportまで通し、新intentのapproval、fallback、audit、state mutationがすべて0、receipt ownerだけが1回完了することを全harnessで検証する。machine injection、別session、malformed/別space/complete target UUID、欠落/不一致Reservation Idはowner `HUMAN_TURN`とmutationが0でなければならない。

## Documentation Decision Workflow

1. public CLIに新flagが追加されるためhelpの該当verb/flagを確認する。
2. protected audit eventとstate transitionをstate-machine referenceへ追加する。
3. doctorが公開flag/event schemaを検査する責務を持つか既存checksから判定する。
4. 該当する場合だけdoctor checkを更新する。該当しない場合はdoctor output/fixtureが矛盾しないことを記録する。
5. frozen [PR #1468](https://github.com/amadeus-dlc/amadeus/pull/1468) をimplementation sourceとして参照しない。

## Verification Pipeline

1. canonical-to-dist generation
2. focused domain/directive/state/orchestrator tests
3. team/human regression tests
4. per-unit and harness integration tests
5. TypeScript type check
6. repository full test suite
7. `dist:check`
8. `promote:self:check`
9. final `git diff --check`

失敗時は最小ownerへ戻して修正し、全checkが同じcommit上でgreenになるまで完了としない。

## External Contract Matrix

| Surface | New behavior | Preserved behavior |
|---|---|---|
| directive | U2最終binding contractから導出したsolo correlation、opaque target ID＋Reservation Id付きawait-approval kind | existing gate fieldと他kind |
| state CLI | U2最終correlation flags、target/Reservation Id flags、strict JSON outcome | 通常human/team wire |
| audit | protected route selection、exact Grant Id approval | event ordering/append-only model |
| conductor | auto-report、prompt-only fallback、target ID＋Reservation Id forwarding | quality ritualとhuman control |
| hook | session予約に基づくowner HUMAN_TURN mint | machine-injection classifier、protected mint |
| distribution | 6 harness同一semantics | harness固有rendering |


## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-25T06:31:48Z
- **Iteration:** 1
- **Scope decision:** none

projection方針は概ね明確だが、U2未解決contractの先取り、cursor switch fixture、walking-skeleton rule、生成後検証順に不整合がある。

### Findings

- BLOCKER: U2 route-intent binding未解決なのにcarrier pairをprojection contractとして確定している。
- MAJOR: active cursor switchと別intent同名stageのcross-harness fixtureがない。
- BLOCKER: HR-11がstance off/effective-offでもhuman-onlyと読め、要件行列に矛盾する。
- MAJOR: generation後のworking treeでfull testを行う検証順序が曖昧。
- canonical generation、conductor semantics、team/human baseline、docs/doctor判断は確認済み。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-25T06:33:33Z
- **Iteration:** 2
- **Scope decision:** none

4指摘は解消され、U2最終binding contractを先取りせずcanonical sourceから6 harnessへ投影する境界として実装可能である。

### Findings

- U2 dependency gateと独自補完禁止を明記した。
- 同名stage別intentへのcursor switchを全6 harness fixture化した。
- walking-skeleton effective-on/off/unknown行列を統一した。
- generation後working treeでfocused/full/drift checksを行う順序へ統一した。
- team/human compatibility、docs/doctor、blocking convergenceを確認した。
