# Code Summary: solo-gate-transaction

上流入力(consumes 全数): code-generation-plan.md、business-logic-model.md、business-rules.md、domain-entities.md、performance-design.md、security-design.md、requirements.md、unit-of-work.md

## 実装概要

U2 `solo-gate-transaction`として、U1の認可domainをdirective carrier、solo route transaction、grant-backed approval commit、targeted human fallbackへ接続した。全harness生成と最終distribution回帰はU3へ残している。

本サマリは前任セッション中断後の引き継ぎで作成した。Step 1〜9はplanのStep単位で実コードを実測監査し、未達だったStep 9(quality ritual counter)とStep 8の一部列挙(revoke、issuer mismatch、後発grant非差し替え、team carrier)を本セッションで補完した。

### Directive carrierとtyped fallback (Step 1、`business-rules.md` TR-08–09/TR-11)

- `amadeus-directive.ts:137-138` が run-stage の `standing_grant_id` / `standing_grant_route_id`、`:499-513` がall-or-none pairと8 hex / UUID v4のexact形式検証、`:317` が他kindでのcarrier拒否を持つ。`gate`はboolean のまま変更していない。
- `AwaitApprovalDirective`(`:237-242`)は `target_intent_id` と `presence_reservation_id` をexact fieldとして持ち、`:333-334` のfield許可集合で未知fieldを拒否する。

### Solo route transaction (Step 2、TR-01–07)

- `amadeus-orchestrate.ts:1565-1629` の `routeSoloStandingGrantDirective` が gate!==true / 非solo / active intent不在で素通しし、workspace outer lock(`:1589`)→route owner intent lock(`:1597`)の順で Route Id 未使用確認(`:1592-1596`)とprotected receipt append(`:1600-1615`)をaudit-firstに行い、成功後だけcarrierを返す(`:1620-1624`)。

### Grant-backed approval entry point (Step 3、TR-15/TR-18–24)

- `amadeus-state.ts:3180-3226` の `classifyApprovalAuthority` が normal / grant-backed / targeted-human / invalid を排他分類する。
- `amadeus-state.ts:2975-3038` の grant branch が workspace outer lock(`:2977`)内でreceipt cardinality exactly one(`:2980-2992`)を確定し、registry上のowner intent(`intentUuidForRecord`、`:3246-3258`、呼び出しは `:2993`)へ pin してからowner lock(`:3002-3003`)内のfresh auditで同一Grant Idを再検証(`:3012-3020`)し、成功時だけverified Grant Id付きの `GATE_APPROVED`→`STAGE_COMPLETED`→state advance を実行する(`:3025-3030`)。

### Expected invalidityとstrict wire (Step 4、TR-16–17/TR-20–21)

- expiry / revoke / scope / provenance / intent mismatch / receipt field mismatch は mutation 前に `printAwaitApproval`(`amadeus-state.ts:3260-3269`)でexit 0・stderr空・単一exact JSONを出す。receipt 0件・複数件は fatal(`:2984-2992`)。
- `amadeus-orchestrate.ts:3214-3260` の `parseGrantApprovalProcessResult` が grant branch のみ exit code / stderr空 / 単一行JSON / exact key集合を検証し、stderr文字列判定を使わない。human/team wireは未変更。

### Presence reservationとtargeted human continuation (Step 5、TR-14d–f/TR-25–26)

- `amadeus-presence-reservation.ts` がversioned armed→minted→consumed markerを `.amadeus-sessions/` へatomic保存する(`:176` arm、`:241` mint、`:301` consume、`:328` verify)。
- fallback時は `amadeus-orchestrate.ts:3544-3567` が同一sessionのreservationをarmし、`target_intent_id` と `presence_reservation_id` を次turnへ搬送する。
- trusted hook `packages/framework/core/hooks/amadeus-mint-presence.ts:94-104` だけが同一sessionのarmed markerからowner `HUMAN_TURN` を exactly once mintし、armed markerが無い場合のみ従来どおりHUMAN_TURNを追記する。
- targeted report は `amadeus-state.ts:3040-3126` で明示Reservation Id、owner provenance、open gateを検証してから既存human approvalを実行する。

### Crash/replay recovery (Step 6、U2-REL-09–10)

- HUMAN_TURN append後marker更新前は `mintArmedPresenceReservation`(`amadeus-presence-reservation.ts:241-259`)がReservation Id exact lookupで0 append / 1 reuse(`already-minted`)/ 他session不可を判別する。
- approval後consume前は `targetedApprovalPrefix`(`amadeus-state.ts:3291`)でowner approval/completion prefixをexact lookupし、`recoverCompletedTargetedApproval`(`:3334`)で既存recovery完了後のmarkerだけを冪等consumeする。

## 変更ファイル

| 区分 | パス | 内容 |
|---|---|---|
| 変更 | `packages/framework/core/tools/amadeus-directive.ts` | carrier pair、typed await-approval schema |
| 変更 | `packages/framework/core/tools/amadeus-orchestrate.ts` | solo route transaction、strict grant wire、fallback reservation arming、`PresenceReservation` 型注釈(本セッション) |
| 変更 | `packages/framework/core/tools/amadeus-state.ts` | authority classifier、grant-backed commit、targeted human commit、recovery |
| 新規 | `packages/framework/core/tools/amadeus-presence-reservation.ts` | armed/minted/consumed reservation state machine |
| 変更 | `packages/framework/core/hooks/amadeus-mint-presence.ts` | trusted sessionのexactly-once mint |
| 変更 | `packages/framework/core/tools/amadeus-lib.ts` / `amadeus-audit.ts` | U1 domainからの連携面 |
| 変更 | `docs/reference/12-state-machine.md` | `GATE_AUTHORIZATION_SELECTED` の emitter registry row 追加(本セッション) |
| 変更 | `tests/unit/t-solo-gate-transaction.test.ts` | carrier / wire / classifier / reservation unit tests、ritual保存とper-unit非route(本セッション追加) |
| 変更 | `tests/integration/t-solo-gate-transaction.test.ts` | route/commit/fallback integration tests、revoke・issuer mismatch・後発grant・team carrier・ritual増分0(本セッション追加) |
| 変更 | `code-generation-plan.md` | Step 3〜10の完了記録 |
| 新規 | `code-summary.md` | 本サマリ |

## 本セッションで追加したtest (Step 8〜9の未達分)

| test | 位置 | 対象 |
|---|---|---|
| adds only the carrier pair and leaves body, reviewer and sensors at one each | `tests/unit/t-solo-gate-transaction.test.ts:204` | FR-09。routed directiveからcarrier 2 keyを除くと入力とbyte一致、body/reviewer各1、sensors不変 |
| never routes a per-unit iteration directive | `tests/unit/t-solo-gate-transaction.test.ts:241` | FR-22。per-unit iteration(gate:false)はcarrierを持てず receipt も生じない |
| falls back when the routed grant is revoked before the commit | `tests/integration/t-solo-gate-transaction.test.ts:397` | TR-16 revoke面 |
| falls back when the routed grant no longer belongs to the receipt owner | `tests/integration/t-solo-gate-transaction.test.ts:426` | TR-23 issuer intent mismatch(validatorの `intent-mismatch` を明示assert) |
| commits the routed Grant Id and never substitutes a later-expiring grant | `tests/integration/t-solo-gate-transaction.test.ts:462` | TR-18。後発の長寿命grant存在下でも `GATE_APPROVED.Grant Id` は routed ID 1件のみ |
| rejects the carrier in team mode before any mutation | `tests/integration/t-solo-gate-transaction.test.ts:497` | TR-21。team modeのcarrierはexit非0・stdout空・state/audit不変 |
| adds zero body, reviewer, sensor and learnings work during the fallback continuation | `tests/integration/t-solo-gate-transaction.test.ts:588` | FR-23。fallback→human continuationで emit された directive に `stage_file`/`reviewer`/`sensors_applicable`/run-stage・present-gate が 0 件 |

既存被覆(前任セッション実装分): success commit、route後expiry、cursor switch pin、receipt 0/1/複数、non-owner delta 0、targeted human continuationと replay 冪等性。

## 検証結果

| コマンド | 実測 |
|---|---|
| `bun run typecheck` | exit 0 |
| `bun test` U1/U2 focused 4 files(`tests/unit/t-solo-gate-transaction.test.ts`、`tests/unit/t-solo-standing-grant-domain.test.ts`、`tests/integration/t-solo-gate-transaction.test.ts`、`tests/integration/t-standing-grant.test.ts`) | exit 0、125 pass / 0 fail / 309 assertions、`Ran 125 tests across 4 files`(期待4 path 全て実在確認済み) |
| `bun test` team/human regression 16 files(`t111`、`t28-audit-event-sync`、`t112-delegated-approval`、`t188-human-presence-gate`、`t186-foreach-per-unit-iteration`、`t-delegate-answer-consume`、`t-phase-check-gate-seam`、`t118`、`t45-revision-loop`、`t48-audit-event-emitters`、`t49`、`t247-runtime-recovery`、`t248-stage-contract-routing`、`t258-engine-error-ambient-shard-pollution`、`t185-stage-artifact-guard`、`t145-state-lock-concurrency`) | exit 1、316 pass / 1 fail、`Ran 317 tests across 16 files`。残1件は下記のU3依存 |
| changed-file `bunx biome lint`(canonical 8 file + test 4 file) | exit 0 |
| `bun run lint`(`biome check tests/ packages/setup/ packages/framework/core/ scripts/`) | exit 0、error 0 / warning 269(既存repository-wide。本Unit由来のerrorは `amadeus-orchestrate.ts:3544` の `noImplicitAnyLet` 1件で、`PresenceReservation` 型注釈により解消済み) |
| `git diff --check` | exit 0 |

`bun scripts/package.ts` / `dist:check` / `promote:self:check` はplan Step 10の宣言どおり実行していない(U3所管)。

## 残課題(U3依存、fail-openにしていない)

- `tests/integration/t48-audit-event-emitters.test.ts` の "forward: every doc (event, emitter) row has a matching call site" が exit 1 のまま残る。原因は本Unitの canonical `amadeus-orchestrate.ts:1600-1601` が `GATE_AUTHORIZATION_SELECTED` を emit する一方、当該testが読む配布面 `dist/claude/.claude/tools/amadeus-orchestrate.ts` が未再生成であること。scratchで両面に同testの述語を適用し canonical=true / dist=false を実測確定した。U3の `bun scripts/package.ts` 再生成で閉包する。
- 同test中の他2件(`emitter registry row count`、`md-md event set`)は `docs/reference/12-state-machine.md` へ emitter registry row を追加して本セッションで解消済み(前任分の docs 同期漏れ)。

## Plan差分

- Step 3〜6の実装は前任セッションで完了しておりチェックボックスのみ未更新だったため、file:line実測で確認して`[x]`へ更新した。
- Step 7の unit suite は既存分で充足、Step 8は4件、Step 9は全件が未達だったため本セッションで追加した。
- 要求外の後方互換レイヤー・フォールバック分岐・移行シムは追加していない。`dist/`とセルフインストールツリーは手編集していない。
