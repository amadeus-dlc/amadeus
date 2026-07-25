# Code Summary: harness-contract-and-regression

上流入力(consumes 全数): business-logic-model.md、business-rules.md、domain-entities.md、performance-design.md、security-design.md、unit-of-work.md、requirements.md

その他参照(stage の consumes 宣言外): code-generation-plan.md(本ステージの produces。Step 別の実装計画として自己参照)、logical-components.md(nfr-design の成果物。owner path 判定の根拠として参照)

> consumes の正本は `packages/framework/core/amadeus-common/stages/construction/code-generation.md:16-32` の `consumes:` 宣言(実測)。宣言のうち `deployment-architecture` は `required: false` で、本 intent では infrastructure-design が SKIP のため成果物が存在せず(`find … -name deployment-architecture.md` 0 件)、参照していないので上記行に載せていない。

## 実装概要

U3として、U1/U2のcanonical contractを6 harnessへ投影し、presence mintをcanonical seamへ集約し、生成物drift 0と全回帰の収束を確定した。canonical sourceだけを編集し、`dist/`とセルフインストールツリーは `bun scripts/package.ts` / `bun run promote:self` だけで同期した(HR-01、NFR-08)。

### Step 1: conductor手順のsolo grant semantics(FR-25、HR-02–03)

- `packages/framework/core/amadeus-common/protocols/stage-protocol.md:167` に `#### Part 0b: Solo standing grant — grant-backed report and typed fallback` を追加した。carrier pairのall-or-none、`GATE_AUTHORIZATION_SELECTED` route receipt、grant-backed reportのflag、`approved`/`await-approval` のtyped分岐、`target_intent_id`＋`presence_reservation_id` のturn間forward、fallback時にbody/reviewer/sensors/§13を再実行しない規則、reject/Request Changes/halt-and-askを自動化しない規則を記述した。flag名は `amadeus-orchestrate.ts:3606-3607` / `amadeus-state.ts:3248-3251` の実装から実測転記した。

### Step 2–3: host session capabilityのcanonical集約(FR-24、HR-04c–04e)

- `packages/framework/core/tools/amadeus-presence-reservation.ts:401` に `HostSessionCapability` union、`:407` に `hostSessionCapability()` 正規化、`:421` に `mintHumanPresence()` を追加した。availableならreservation mint、それ以外(またはreservation不在)は従来どおり untargeted `HUMAN_TURN` を append する。
- core hook `packages/framework/core/hooks/amadeus-mint-presence.ts:98` はこのseam経由へ置換した。
- Codex `packages/framework/harness/codex/hooks/amadeus-codex-adapter.ts:371`、Kiro CLI `packages/framework/harness/kiro/hooks/amadeus-kiro-adapter.ts:272` はinline `appendAuditEntry("HUMAN_TURN")` をseamへ差し替え、それぞれ native `session_id` をunionへ変換する。
- Kiro IDE `packages/framework/harness/kiro-ide/hooks/amadeus-kiro-adapter.ts:111` は `hostSessionCapability(undefined, ...)` = `unavailable`。promptSubmitがstable session identityを持たないため targeted continuationは発火せず、共有key/PID/active cursorへ縮退しない(HR-04e、security-design § Harness Capability)。
- Cursor `packages/framework/harness/cursor/hooks/amadeus-cursor-lib.ts:111-122` はcore mint hookへ `session_id` をforwardするようにした(従来はpromptのみ)。
- OpenCodeはprompt hook自体を持たないためmint siteがなく、投影されたcore hookがseamを保持する。

### Step 4: 6 harness生成とセルフインストール同期(FR-24、NFR-08)

`bun scripts/package.ts` と `bun run promote:self` で claude / codex / cursor / kiro / kiro-ide / opencode の6 dist と `.claude|.codex|.cursor|.opencode` セルフインストール面を再生成した。生成物の手編集は0件。

### Step 5: 全harness contract regression test(FR-24–25、HR-15、NFR-07)

新規 `tests/integration/t-solo-standing-grant-harness.test.ts`(25 tests)。6 harness × { authorization module 5本のbyte一致、directive/state/audit marker、conductor protocol marker } と mint owner 5面のseam配線、Kiro IDE unavailable、OpenCode mint site不在を検証する。

**落ちる実証**: `git checkout HEAD -- dist/kiro/.kiro/tools/amadeus-directive.ts`(投影前の配布面へ差し替え)で 2 fail / 23 pass を実測し、`bun scripts/package.ts` 再生成で 25 pass / `dist:check` exit 0 へ復帰することを確認した(注入はコミットせず同一手順内で復帰、stash不使用)。

### Step 6: 回帰の閉包

- `tests/integration/t48-audit-event-emitters.test.ts`(U2が残した配布面依存): mintの実append位置がseamへ移ったため、`docs/reference/12-state-machine.md:283` の `HUMAN_TURN` emitter行を `tools/amadeus-presence-reservation.ts` へ更新し(hook/adapterはseamを呼ぶだけであることを明記)、`packages/framework/core/knowledge/amadeus-shared/audit-format.md:53` も同一事実へ同期した。16 pass / 0 fail。
- `tests/unit/t210-adapter-mint-classifier.test.ts:337`: 「adapter内にclassifierとmintが同居する」guardを、新seam契約(`mintHumanPresence` 実在＋adapter-local `appendAuditEntry("HUMAN_TURN")` 不在)へ更新した。guardの趣旨(classifierを迂回するmint siteを作らせない)は強化方向。
- `tests/unit/t81.test.ts:262`(assertion 行): `VALID_EVENT_TYPES` 件数 77→78(`GATE_AUTHORIZATION_SELECTED` 追加分)。あわせて導出コメント(`:243-253`)の既存ドリフトを是正した — 冒頭の総計が `70` のまま据え置かれ、`#1424` の `INTENT_ARCHIVED` / `INTENT_UNARCHIVED`(+2)が導出列から欠落していたため、加算列が 76 にしか到達せず assertion の 78 と一致していなかった。総計を 78 に直し、`75 → +2(#1424) = 77 → +1(#1466) = 78` へ導出を実数へ合わせた(実測: `VALID_EVENT_TYPES` の実要素数 78、`#1424` = `2e157d7fe` の diff に `INTENT_ARCHIVED` / `INTENT_UNARCHIVED` の追加を確認)。
- test-size purity ratchet(`tests/unit/t-test-size-drift.test.ts`): U1/U2のunit suite 2本が実FS利用でmedium判定だったため、純関数部をunitに残し実FS部をintegrationへ分割した(`tests/integration/t-solo-gate-transaction-seam.test.ts`、`tests/integration/t-solo-standing-grant-domain.test.ts` を新設)。挙動・assertionは移送のみで不変(移送前後とも全green)。
- coverage registry: `bun tests/gen-coverage-registry.ts` を再生成し、`tests/unit/gen-coverage-registry.test.ts` の `EXPECTED_NONE_TO_CLI` に `integration/t-solo-gate-transaction.test.ts` を追記した。ratchetは function 143→145 と上方向のみ。
- `tests/integration/t259-guard-corpus.test.ts`: U2の `(options.routeIdFactory ?? randomUUID)()` がcorpus scannerの分類対象外だったため、`packages/framework/core/tools/amadeus-orchestrate.ts:1629-1630` を `const mintRouteId = ...; const routeId = mintRouteId();` へ挙動不変で分解した(guardを緩めず実装側を分類可能形にした)。
- complexity gate: U1/U2実装由来の NEW_VIOLATION 4件(`parseReservation` CCN 36、`amadeus-state.ts` の匿名3件)と `validateDirective` の 19→20 ratchet regression が残っていたため、gate自身が定める reviewed exception 経路 `bun tests/complexity-gate.ts --update` でbaselineを更新した。**これは実装のリファクタではなくbaseline受容であり、レビュー判断を要する**(下記「レビュー判断が必要な事項」参照)。

### Step 7: 文書化要否の判定(FR-26)

| Surface | 既存責務 | 変更 | 根拠 |
|---|---|---|---|
| `/amadeus` help | `/amadeus` utility verbのみを列挙(`amadeus-utility.ts:209-424` HELP_TEXT_TAIL) | 不要 | 本Unitが追加した公開面はstate/orchestrate CLIのflagであり、helpは元から `grant-standing-delegation` 等のstate verbを記載していない(実測: help出力に standing/grant の語 0 件) |
| doctor | `standingGrantDoctorCheck`(`amadeus-utility.ts:947`)が有効grantを報告 | 不要 | `findActiveStandingGrant`(`amadeus-lib.ts:3851`)はmode非依存にspace全intentの `GRANT_ISSUED` を走査するため、solo grantも既存checkでそのまま報告される。出力・fixtureとの矛盾なし |
| state-machine reference | 監査event registry | 更新済 | `GATE_AUTHORIZATION_SELECTED` 行はU2で追加済。本Unitは `HUMAN_TURN` のemitter行をseamへ是正(`docs/reference/12-state-machine.md:283`) |
| audit-format(knowledge) | event catalog | 更新済 | `HUMAN_TURN` のemitter列をseームへ同期(`audit-format.md:53`) |

frozen PR #1468 は参照・依存していない。

### Step 8: HR-15 test trace(FR-01–26 / NFR-01–08)

HR-15(全 FR/NFR に最低1つの test trace)の証跡。行番号は本 worktree の HEAD(`5603a808d` への is-ancestor マージ後)で実測した。U1/U2 が出荷した trace も含む全数表で、U3 はこの表の閉包を所有する。

| 要件 | test trace(file:line、テスト名) |
|---|---|
| FR-01 | `tests/integration/t-standing-grant.test.ts:588` "handleGrantStandingDelegation: happy path emits a grant and prints JSON"、`:646` "refuses when no fresh human turn backs the call"、`:360` "grant-standing-delegation succeeds in solo mode (env unset)" |
| FR-02 | `tests/integration/t-solo-standing-grant-domain.test.ts:165` "does not select from a non-active intent even when its issue is valid"、`tests/integration/t-standing-grant.test.ts:658` "refuses when no active intent grounds the grant" |
| FR-03 | `tests/integration/t-standing-grant.test.ts:679` "handleRevokeStandingDelegation: happy path emits GRANT_REVOKED"、`:691` "solo appends unknown ids and still validates shape"、`:390` "RED: revoke-standing-delegation rejects a non-8-hex grant id"、`:795` "refuses when no fresh human turn backs the call" |
| FR-04 | `tests/integration/t-standing-grant.test.ts:269` "TTL boundary: valid just before expiry, invalid just after"、`:370` "RED: `--ttl-ms 'five'` is a loud refusal"、`:623` "refuses a bad --scope and a bad --ttl-ms"、`tests/integration/t-solo-standing-grant-domain.test.ts:190` "accepts a rounded positive TTL fact but treats expiry equality as inactive" |
| FR-05 | `tests/integration/t-solo-standing-grant-domain.test.ts:224` "excludes expired, revoked, cross-intent, malformed, and ambiguous issue ids"、`tests/integration/t-standing-grant.test.ts:296` "RED: a grant with no grounding HUMAN_TURN on disk is not honoured"、`:193`/`:202`/`:211` `StandingGrant.parse` の不正 block 群 |
| FR-06 | `tests/unit/t-solo-standing-grant-domain.test.ts:143` "does not invent authorization when no gate exists or a per-unit iteration is incomplete"(gate 有無と認可源の分離)、`tests/integration/t-solo-gate-transaction-seam.test.ts:135` "adds only the carrier pair and leaves body, reviewer and sensors at one each" |
| FR-07 | `tests/integration/t-solo-standing-grant-domain.test.ts:203` "selects by expiry, then issued timestamp, then Grant Id"(完全順序)、`tests/integration/t-standing-grant.test.ts:302` "returns the latest-expiring grant when several are valid"、`:309` "determinism: same corpus + same now yields the same result twice" |
| FR-08 | `tests/unit/t-solo-gate-transaction.test.ts:34` "accepts the Grant Id and Route Id pair without changing gate"、`:57` "rejects carrier fields on non-run-stage directives" |
| FR-09 | `tests/integration/t-solo-gate-transaction-seam.test.ts:135` "adds only the carrier pair and leaves body, reviewer and sensors at one each"(FR-09 タグは同ファイル内に明記) |
| FR-10 | `tests/integration/t-solo-gate-transaction.test.ts:462` "commits the routed Grant Id and never substitutes a later-expiring grant"、`tests/integration/t-standing-grant.test.ts:844` "handleApprove: a covering opt-in grant opens the gate and stamps the Grant Id" |
| FR-11 | `tests/integration/t-solo-standing-grant-harness.test.ts:119-131` conductor protocol marker テスト(6 harness `test.each`)— `:128-130` が `Request Changes, reject, and halt-and-ask stay human decisions` の実在を 6 dist 全てで assert する(コメント `:128` に FR-11 と明記)。加えて `tests/unit/t-solo-gate-transaction.test.ts:143` "rejects mixed, partial, or non-solo authority" が approve 以外の authority 合成を classifier 段で fail-closed にする |
| FR-12 | `tests/integration/t-solo-gate-transaction.test.ts:462` "commits the routed Grant Id and never substitutes a later-expiring grant"、`:426` "falls back when the routed grant no longer belongs to the receipt owner" |
| FR-13 | `tests/integration/t-solo-gate-transaction.test.ts:397` "falls back when the routed grant is revoked before the commit"、`:426`、`:557` "falls back when the unique receipt fields do not match the carrier" |
| FR-14 | `tests/integration/t-solo-gate-transaction.test.ts:462`、`tests/integration/t-standing-grant.test.ts:844`(`GATE_APPROVED` の `Grant Id` 一致) |
| FR-15 | `tests/integration/t-solo-gate-transaction.test.ts:397`/`:426`/`:557`(いずれも typed non-error fallback を assert)、`tests/unit/t-solo-gate-transaction.test.ts:149` "decodes only approved and typed await single-line JSON" |
| FR-16 | `tests/integration/t-solo-gate-transaction.test.ts:588` "adds zero body, reviewer, sensor and learnings work during the fallback continuation" |
| FR-17 | `tests/integration/t-solo-gate-transaction.test.ts:397`/`:426`(fallback 時の audit 増分 0 と stage 不変)、`:536` "treats a missing receipt as a fatal protocol error without state mutation" |
| FR-18 | `tests/integration/t-solo-gate-transaction.test.ts:292` "falls back through a session reservation and commits targeted human approval"、`tests/integration/t-solo-gate-transaction-seam.test.ts:201` "moves armed to minted exactly once and then consumed"、`:243` "keeps minting ordinary presence while a reservation is held"(本レビューで追加した回帰) |
| FR-19 | `tests/integration/t-solo-gate-transaction.test.ts:497` "rejects the carrier in team mode before any mutation"、`tests/integration/t-standing-grant.test.ts:463` "WHITE: team mode issues a grant-authorised delegation and stamps the Grant Id"、`:731` "handleDelegateApproval: a covering grant authorises the delegation in-process" |
| FR-20 | `tests/integration/t-standing-grant.test.ts:232` "an opt-out grant does NOT cover a phase-boundary gate"、`:238` "WHITE: an opt-in grant covers a phase-boundary gate"、`tests/unit/t-solo-standing-grant-domain.test.ts:159` "applies phase-boundary opt-in before walking-skeleton policy" |
| FR-21 | 適用行列は `tests/integration/t-standing-grant.test.ts:892-911` の `describe("skeleton exclusion honours un-normalized stance (e3 Major-1)")` 4 行 — `:893` scope-dependent stance + greenfield scope、`:898` absent stance + greenfield scope、`:903` explicit off stance、`:908` scope-dependent stance on an incremental scope。基本の on/off 2 行は `:227` "RED: the walking-skeleton gate is NOT covered while Skeleton Stance is on" と `:249` "the skeleton gate IS covered once Skeleton Stance is off" |
| FR-22 | `tests/integration/t-solo-gate-transaction-seam.test.ts:172` "never routes a per-unit iteration directive"(FR-22 タグを同ファイルに明記)、`tests/unit/t-solo-standing-grant-domain.test.ts:143` |
| FR-23 | `tests/integration/t-solo-gate-transaction.test.ts:588`、`tests/integration/t-solo-standing-grant-harness.test.ts:127-129`(6 dist で `Do NOT re-run the stage body, reviewer, sensors, or §13 learnings` の実在を assert) |
| FR-24 | `tests/integration/t-solo-standing-grant-harness.test.ts:98`(`CONTRACT_TOOLS` 5本の byte 一致 × 6 harness)、`:109`(directive/state/audit marker)、`:134`(mint owner seam 配線)、`:145` kiro-ide unavailable、`:155` opencode mint site 不在。加えて `bun run dist:check` / `promote:self:check` |
| FR-25 | `tests/integration/t-solo-standing-grant-harness.test.ts:119` conductor protocol marker(`PROTOCOL_MARKERS` を 6 dist 全てで assert) |
| FR-26 | 本ファイル § Step 7 の判定表(help / doctor は「不要」、state-machine reference と audit-format は「更新済」)。更新側の回帰は `tests/integration/t48-audit-event-emitters.test.ts`(16 pass、`HUMAN_TURN` emitter 行と実装の一致を assert)と `tests/unit/t81.test.ts:262`(event registry 件数) |
| NFR-01 | `tests/integration/t-solo-gate-transaction-seam.test.ts:50` "appends the protected receipt before returning the carrier pair"(audit-first)、`tests/integration/t-standing-grant.test.ts:343` "presenceMintRejection rejects lifecycle events and route receipts"、`:350` "handleAppend throws for lifecycle events and route receipts"(protected-event mint guard) |
| NFR-02 | `tests/integration/t-solo-gate-transaction.test.ts:397`/`:426`/`:462`(注入した clock と revocation seam のみで race を再現し、sleep を使わない)、`tests/integration/t-standing-grant.test.ts:269` TTL 境界 |
| NFR-03 | `tests/integration/t-solo-gate-transaction.test.ts:462`(Grant Id substitution)、`:426`(cross-intent)、`tests/integration/t-standing-grant.test.ts:296`(forged provenance)、`tests/unit/t-solo-gate-transaction.test.ts:143`(authority 合成) |
| NFR-04 | `tests/unit/t-solo-gate-transaction.test.ts:149` "decodes only approved and typed await single-line JSON"、`:184` "keeps nonzero process failure fatal"、`tests/integration/t-solo-gate-transaction.test.ts:536`/`:665`(真正 error は fatal のまま) |
| NFR-05 | FR-19 の trace 一式 + 全 suite 実行(§ 検証結果)。`tests/integration/t48-audit-event-emitters.test.ts` の golden/audit field 差分 0 |
| NFR-06 | `tests/integration/t-solo-standing-grant-harness.test.ts:55-65` の `CONTRACT_TOOLS` / `CONTRACT_MARKERS` 表 — gate policy・grant eligibility・route carrier・commit authorization が別 module に分かれている前提を、module 名と marker の対応として固定する |
| NFR-07 | 本表そのもの(全 FR に最低1 trace)+ test-size purity ratchet `tests/unit/t-test-size-drift.test.ts`(unit/integration の層配置)+ `tests/unit/gen-coverage-registry.test.ts` |
| NFR-08 | `tests/integration/t-solo-standing-grant-harness.test.ts:98`(6 dist の byte 一致)+ `bun run dist:check` / `bun run promote:self:check`(§ 検証結果に実測 exit code) |

本 Unit 固有の HR のうち、cursor switch 系の 2 本は上表の FR 行に埋もれるため個別に示す。

| 規則 | test trace(file:line、テスト名) |
|---|---|
| HR-21(route 後に cursor を別 intent へ切替えても非 owner の mutation 0) | `tests/integration/t-solo-gate-transaction.test.ts:258` "pins a valid grant commit to the receipt owner after a cursor switch" |
| HR-23(cursor switch → fallback → same-session human turn → targeted report で owner だけ完了) | `tests/integration/t-solo-gate-transaction.test.ts:292` "falls back through a session reservation and commits targeted human approval" |

いずれも harness 表層に分岐を持たない core 経路のため、6 harness への移送は下記 byte-identity の代表化に依る(HR-21 の「全harnessで検証する」はこの代表化で満たす)。

**6 harness を byte-identity で代表化している論拠**: `CONTRACT_TOOLS` の 5 module は harness 中立の `packages/framework/core/tools/` 正本を `scripts/package.ts` がそのまま投影したコピーで、harness ごとの overlay を一切持たない。したがって「6 dist の当該ファイルが canonical と byte 一致する」ことが確認できれば、canonical に対する挙動 test(FR-01–23 の unit/integration 群)の結論はそのまま 6 harness へ移送される — 各 harness で挙動 test を 6 回反復する必要がない。byte 一致が崩れた瞬間に `:98` の `test.each` と `dist:check` が同時に赤くなることは、Step 5 の落ちる実証(`dist/kiro` を投影前へ差し替え → 2 fail)で実証済み。**harness 表層が実際に分岐する面だけは代表化せず個別に test する**: mint owner の seam 配線 5 面(`:134`)、Kiro IDE の `unavailable`(`:145`)、OpenCode の mint site 不在(`:155`)がそれで、これらは `packages/framework/harness/<name>/` 側の実装差なので byte-identity では覆えない。

## 変更ファイル

| 区分 | パス | 内容 |
|---|---|---|
| 変更 | `packages/framework/core/amadeus-common/protocols/stage-protocol.md` | Part 0b conductor semantics |
| 変更 | `packages/framework/core/tools/amadeus-presence-reservation.ts` | `HostSessionCapability` / `hostSessionCapability` / `mintHumanPresence` |
| 変更 | `packages/framework/core/hooks/amadeus-mint-presence.ts` | canonical seam経由へ置換 |
| 変更 | `packages/framework/core/tools/amadeus-orchestrate.ts` | route id mintの分類可能形への分解(挙動不変) |
| 変更 | `packages/framework/harness/codex/hooks/amadeus-codex-adapter.ts` | seam投影＋session_id正規化 |
| 変更 | `packages/framework/harness/kiro/hooks/amadeus-kiro-adapter.ts` | seam投影＋session_id正規化 |
| 変更 | `packages/framework/harness/kiro-ide/hooks/amadeus-kiro-adapter.ts` | seam投影(unavailable、fail-closed) |
| 変更 | `packages/framework/harness/cursor/hooks/amadeus-cursor-lib.ts` | mint payloadへ session_id forward |
| 変更 | `packages/framework/core/knowledge/amadeus-shared/audit-format.md`、`docs/reference/12-state-machine.md` | `HUMAN_TURN` emitterの是正 |
| 新規 | `tests/integration/t-solo-standing-grant-harness.test.ts` | 6 harness contract regression |
| 新規 | `tests/integration/t-solo-gate-transaction-seam.test.ts`、`tests/integration/t-solo-standing-grant-domain.test.ts` | U1/U2 unit suiteの実FS部の層移送 |
| 変更 | `tests/unit/t-solo-gate-transaction.test.ts`、`tests/unit/t-solo-standing-grant-domain.test.ts` | 純関数部のみを残す分割 |
| 変更 | `tests/unit/t210-adapter-mint-classifier.test.ts`、`tests/unit/t81.test.ts`、`tests/unit/gen-coverage-registry.test.ts` | seam契約・event件数・spawner台帳の同期 |
| 変更 | `tests/.coverage-registry.json`、`tests/.coverage-ratchet.json`、`tests/.complexity-baseline.json` | 生成物・baseline更新 |
| 生成 | `dist/<6 harness>/**`、`.claude|.codex|.cursor|.opencode/**` | 106 path(dist 64 / self-install 42)。すべて生成コマンド経由 |

## 検証結果(すべて生成後の同一working tree、実測)

| コマンド | 実測 |
|---|---|
| `bun run typecheck` | exit 0 |
| `bun run lint` | exit 0(error 0 / warning 273。既存repository-wide 269 + 本Unitの新規test 3ファイル由来 4 warning。変更ファイル限定 `bunx biome lint`(15 file)は exit 0) |
| `bun run dist:check` | exit 0 |
| `bun run promote:self:check` | exit 0 |
| focused suites 7 file(`tests/unit/t-solo-gate-transaction.test.ts`、`tests/unit/t-solo-standing-grant-domain.test.ts`、`tests/integration/t-solo-gate-transaction.test.ts`、`tests/integration/t-solo-gate-transaction-seam.test.ts`、`tests/integration/t-solo-standing-grant-domain.test.ts`、`tests/integration/t-standing-grant.test.ts`、`tests/integration/t-solo-standing-grant-harness.test.ts`) | exit 0、150 pass / 0 fail / 545 assertions、`Ran 150 tests across 7 files`(全path実在確認済み、期待7ファイルと一致) |
| regression suites 10 file(`t210-adapter-mint-classifier`、`t81`、`t111`、`t28-audit-event-sync`、`t112-delegated-approval`、`t188-human-presence-gate`、`t48-audit-event-emitters`、`t-test-size-drift`、`t134-mechanism-honesty`、`gen-coverage-registry`) | exit 0、253 pass / 0 fail / 1700 assertions、`Ran 253 tests across 10 files`(期待10ファイルと一致) |
| `bash tests/run-tests.sh --ci` | exit 3、Test files 521 / Total assertions 7314 / Failed files 3 / Failed assertions 3。残3件はすべて下記の環境起因(本変更由来 0 件) |
| `git diff --check` | exit 0 |

### 全testスイートの残3件(本変更由来ではない、実測帰属)

- `tests/integration/t257-status-registry-migration.test.ts`「records complete 100-child p95, RSS pairs, growth, and provenance」
- `tests/integration/t258-lifecycle-transaction.test.ts`「records 100-child p95 and paired incremental RSS with provenance」
- `tests/integration/t259-guard-integration.test.ts`「10k-row guard overhead remains bounded for all operations」

3件とも失敗理由は同一の `cannot resolve Git ref refs/heads/<branch>`(provenance採取)。機序: 各testのref解決helper(例 `t257-status-registry-migration.test.ts:205-215`)はloose refを **worktreeのgitDir配下** だけで探し、見つからなければ common dirの `packed-refs` を読む。git worktreeではbranchのloose refはcommon dirの `refs/heads/` にあるため探索から外れ、`packed-refs` にも未収録(実測: `packed-refs` grep 0 件、`<common>/refs/heads/codex/solo-standing-grants` は実在)で常に throw する。worktree実行環境固有で、3ファイルとも本変更で1行も触れていない(`git diff HEAD -- <3 file>` は空)。

## Plan差分

- Step 1–8は計画どおり実施。Step 6は計画時点で想定していなかった付随閉包(t210 seam契約、t81 event件数、test-size層移送、coverage registry、guard corpus、complexity baseline)を含む。いずれもU1/U2実装が残した既存gateとの整合であり、gateを緩める方向の変更は complexity baseline の受容1件のみ(この1件も末尾の是正節で差し戻し、リファクタで解消済み)。
- 要求外の後方互換レイヤー・フォールバック分岐・移行シム・二重実装は追加していない。`dist/`とセルフインストールツリーの手編集は0件。

## レビュー判断が必要な事項(builderは自己判断で確定していない)

1. **OpenCode native prompt plugin / Kiro IDE stable identity adapter を実装していない。** `logical-components.md` は `packages/framework/harness/opencode/amadeus-opencode-plugin.ts`(新規)とKiro IDE capability更新をowner pathとして挙げるが、`business-logic-model.md` § Identity Sources と `security-design.md` § Harness Capability は「両harnessはnative stable identity adapterが完成するまでtargeted continuationを完了扱いにせず、mutation 0でfail-closed」と定める。requirements.md にも新規host pluginを要求するFRはない。未実測の外部host API(OpenCode plugin API)へ確約を書くことは `external-seam-vocab-measurement` に反するため、本Unitでは **fail-closed側(unavailable)を実装してtestで固定** し、新規plugin実装は行っていない。**→ 2026-07-25 のユーザー裁定により決着済み。下記「ユーザー裁定: OpenCode / Kiro IDE の native identity adapter」節を参照。**
2. **complexity gate baseline の受容更新。** U1/U2実装由来の CCN 超過4件と `validateDirective` 19→20 のratchet regressionを、リファクタではなく `--update` によるbaseline受容で解消した。他Unitの実装本体をこの段階で改変するリスクを避けた判断であり、リファクタを選ぶなら差し戻しが必要。**→ 2026-07-25 のユーザー裁定により差し戻し済み。本ファイル末尾の「是正: complexity gate の baseline 受容を差し戻し、リファクタで解消」節を参照。**

---

## ユーザー裁定: OpenCode / Kiro IDE の native identity adapter(2026-07-25)

### 裁定

- **裁定日**: 2026-07-25
- **裁定内容**: 上記「レビュー判断が必要な事項」1 について、ユーザーは **「fail-closed のまま本 intent を完了し、両ハーネス分は別 Issue へ切り出す」** を選択した。したがって OpenCode native prompt plugin と Kiro IDE stable identity adapter は本 intent では実装せず、現行の `unavailable`(targeted continuation 不発火・縮退なし)を最終形として出荷する。
- **受け入れ境界**: **両 harness の targeted continuation は本 intent の acceptance に含めない。** `logical-components.md` が owner path として挙げた `packages/framework/harness/opencode/amadeus-opencode-plugin.ts`(新規)と Kiro IDE capability 更新は、本 intent の完了条件から外れる。
- **切り出し先**: 別 Issue へ切り出し予定。**Issue 番号は[#1480](https://github.com/amadeus-dlc/amadeus/issues/1480)(2026-07-25 起票)。**

### `performance-design.md` Review Iteration 2 との関係

`nfr-design/performance-design.md` の Review Iteration 2 は両 owner path を RESOLVED として確定しているが、これは「owner path が設計上どこに属するかの帰属が解決した」ことを指し、「本 intent で実装する」ことを意味しない。実装可否は上記裁定で分離された。本節を置くことで、実装未着手が承認済み設計からの無申告逸脱ではなく、裁定に基づく明示的なスコープ外化であることを記録する。

### 現行の出荷状態(実測)

- Kiro IDE: `packages/framework/harness/kiro-ide/hooks/amadeus-kiro-adapter.ts:111` が `hostSessionCapability(undefined, …)` = `unavailable`。
- OpenCode: prompt hook 自体が存在せず mint site がない(投影された core hook が seam を保持)。
- 両者の fail-closed は `tests/integration/t-solo-standing-grant-harness.test.ts:145`(kiro-ide unavailable)と `:155`(opencode mint site 不在)で固定済み。

---

## 是正: complexity gate の baseline 受容を差し戻し、リファクタで解消(2026-07-25)

### ユーザー裁定

上記「レビュー判断が必要な事項」2 について、ユーザーは **「リファクタで解消させる」** を選択した。したがって前任 builder の `bun tests/complexity-gate.ts --update`(reviewed exception 経路)による baseline 受容を差し戻し、実装の分解で gate を通す。

### 差し戻した baseline

- ファイル: `tests/.complexity-baseline.json`
- 復元方法: `git checkout HEAD -- tests/.complexity-baseline.json`(git 履歴からの復元。手書き復元はしていない)
- 差し戻した受容内容(前任の `git diff` 実測): `validateDirective` 19→20 の書き換え、`parseReservation` CCN 36 の新規エントリ追加、`amadeus-state.ts` の `(anonymous)` ordinal 16→18 / 19→21 の書き換えと ordinal 25(CCN 16)の新規エントリ追加。
- 現在の状態: `git status --short tests/.complexity-baseline.json` は空出力 = HEAD と同一。

### 是正前の実測(`bun tests/complexity-gate.ts --check`, exit 1)

```
COMPLEXITY GATE FAILED [NEW_VIOLATION]: 4 function(s) over CCN 15 and not in the baseline:
  CCN 36  parseReservation  packages/framework/core/tools/amadeus-presence-reservation.ts
  CCN 30  (anonymous)  packages/framework/core/tools/amadeus-state.ts
  CCN 16  (anonymous)  packages/framework/core/tools/amadeus-state.ts
  CCN 16  (anonymous)  packages/framework/core/tools/amadeus-state.ts
COMPLEXITY GATE FAILED [RATCHET_REGRESSION]: 1 baselined function(s) got MORE complex:
  CCN 19 -> 20  validateDirective  packages/framework/core/tools/amadeus-directive.ts
```

### 違反の帰属(lizard 直実測による切り分け)

`amadeus-state.ts` の 3 件のうち **2 件は ordinal ずれによる誤帰属** だった。HEAD の測定(`git show HEAD:...` を lizard へ通した実測)と現行測定の対照:

| lizard ordinal (HEAD) | CCN (HEAD) | ordinal (是正前) | CCN (是正前) | 帰属 |
|---|---|---|---|---|
| 16 | 30 | 18 | 30 | 既存関数。ordinal ずれのみ(複雑度不変) |
| 19 | 16 | 21 | 16 | 既存関数。ordinal ずれのみ(複雑度不変) |
| 23 | 13 | 25 | 16 | 真の複雑度増(+3) |

ordinal が +2 ずれた原因: U1/U2 で追加された `operationWithLock` / `withStateOperationTarget` の **パラメータ位置のインライン関数型注釈**(`fn: () => T ...`)を lizard が `(anonymous)` として計数していたため。名前付き type alias にすると計数されないことを scratch(`/tmp/t2.ts`)で決定的に確認した(インライン矢印型 → `(anonymous)@1-1` 1 件 / alias 化 → 0 件)。これは `cid:code-generation:complexity-baseline-ordinal`(匿名増ゼロを第一手とする)の適用ケース。

### 分解した関数と実測 CCN(前→後)

| file:line(是正後) | 関数 | CCN 前 → 後 | 手法 |
|---|---|---|---|
| `packages/framework/core/tools/amadeus-presence-reservation.ts:137-159` | `parseReservation` | **36 → 9** | 巨大な単一 boolean 式を、フィールド名で引く parse 規則テーブル `RESERVATION_FIELD_CHECKS`(`Readonly<Record<ReservationKey, ReservationFieldCheck>>`、`:73-75`)へ置換。state と provenance の整合判定を `provenanceMatchesState`(`:93-97`, CCN 4)へ抽出 |
| `packages/framework/core/tools/amadeus-directive.ts:391-442` | `validateDirective` | **20 → 10** | 11 分岐の `switch (kind)` を、既存の `KNOWN_FIELDS_BY_KIND` と同型のディスパッチテーブル `FIELD_CHECKS_BY_KIND`(`Readonly<Record<DirectiveKind, DirectiveFieldCheck>>`, `:358-382`)へ置換。`Record` が DirectiveKind に対して total なため、kind 追加時の検査漏れは従来の `switch` 網羅性検査と同じくコンパイルエラーになる |
| `packages/framework/core/tools/amadeus-state.ts:2108-2214`(`handleCompleteWorkflow` の lock 内クロージャ) | `(anonymous)` ordinal 22 | **16 → 12** | 完了時の intent registry 行遷移 + active-intent カーソル解放を `completeIntentRegistryRow`(`:2223-2235`)へ抽出。抽出先はハンドラの**後方**に配置し、baseline 済み ordinal 16 / 19 の位置を動かしていない |
| `packages/framework/core/tools/amadeus-state.ts:644-645` | (型注釈) | 匿名 2 件 → 0 件 | パラメータ位置のインライン関数型を `SyncOperation<T>` / `TargetedOperation<T>` の type alias へ抽出。これにより baseline 済み anonymous の ordinal が 18/21 → **16/19 に復帰**(CCN は 30 / 16 のまま不変) |

是正後の lizard 実測(baseline 該当分):

```
ord=16 ccn=30 (anonymous)@1753-1976@packages/framework/core/tools/amadeus-state.ts
ord=19 ccn=16 (anonymous)@1988-2081@packages/framework/core/tools/amadeus-state.ts
ord=22 ccn=12 (anonymous)@2107-2212@packages/framework/core/tools/amadeus-state.ts
      24     9   166     1    25 parseReservation@137-161@.../amadeus-presence-reservation.ts
      ...   10   ...            validateDirective@391-447@.../amadeus-directive.ts
```

### 計測盲点の自己捕捉(gate の偽グリーン回避)

`parseReservation` の分解直後、`complexity-gate.ts --check` は exit 0 を返したが、`python3 -m lizard --csv .../amadeus-presence-reservation.ts | wc -l` が **4**(416 行のファイルで関数 4 件)であり、lizard がファイル途中で解析を打ち切っていた = gate がこのファイルを見ていない偽グリーンだった。切り分け(先頭 N 行での二分探索、`/tmp/head.ts`)で、テーブル内に正規表現リテラルを直接引数として並べた行から先が不可視化されることを特定。正規表現を既存様式どおり名前付き const(`SHA256_HEX_RE` / `STAGE_SLUG_RE` / `SHARD_NAME_RE`)へ切り出して解消し、可視関数数は **4 → 27** に回復した。その状態で改めて gate を実測して exit 0 を確認している(下表)。

### 挙動不変性

- `parseReservation`: 例外メッセージ 3 種(`must be an object` / `has an unknown or missing field` / `field is malformed` / `state does not match its provenance`)と送出条件は不変。フィールド検査の評価順は元の短絡順(宣言順)からテーブルのキー順(`RESERVATION_KEYS` の昇順)へ変わるが、どのフィールドが落ちても送出されるメッセージは同一のため観測可能な差はない。
- `validateDirective`: 各 kind に対する検査呼び出しとその順序、`errors` への push 文言は switch 版と 1:1。
- `completeIntentRegistryRow`: 元の逐次処理をそのまま移設。呼び出し位置は `operationWriteState` の直後・`console.log` の直前で不変(= 保持中のロック内、audit 行の順序と内容は不変)。
- 公開契約(exit code、stdout/stderr の wire schema、audit event の順序と内容)への変更なし。要求外の後方互換レイヤー・フォールバック分岐は追加していない。

### 検証(すべて同期実行、実測 exit code)

| コマンド | 実測 |
|---|---|
| `bun tests/complexity-gate.ts --check` | **exit 0** — `complexity gate: OK — 0 new violations, 0 regressions, baseline 59 entries (worst CCN 65), threshold 15`(warn band 129 件は informational) |
| `bun run typecheck` | exit 0 |
| `bun run lint` | exit 0(全体: 272 warnings / 20 infos、いずれも既存の複雑度 informational) |
| `bunx @biomejs/biome check` 変更3ファイル限定 | exit 0 — `Checked 3 files`, 17 warnings。全件 `amadeus-state.ts` の既存 `lint/complexity/*`・`lint/correctness/*`。`amadeus-directive.ts` / `amadeus-presence-reservation.ts` は 0 件(新規 error/warning 増ゼロ) |
| `bun scripts/package.ts` | exit 0 |
| `bun run promote:self` | exit 0 |
| `bun run dist:check` | exit 0 — `all harness trees in sync` |
| `bun run promote:self:check` | exit 0 — `project-local self install is in sync` |
| `bash tests/run-tests.sh --ci` | exit 3 — Test files 521 / Total assertions 7314 / **Failed files 3 / Failed assertions 3** |
| `git diff --check` | exit 0 |

`run-tests.sh --ci` の残 3 件は本是正の前と同一・同数で、既知の worktree 実行固有バグ(ref 解決 helper が common dir の `refs/heads/` を見ない)由来:

- `t257 status registry performance contract > records complete 100-child p95, RSS pairs, growth, and provenance`
- `t258 intent lifecycle transaction performance contract > records 100-child p95 and paired incremental RSS with provenance`
- `t259 guard integration falling proofs > 10k-row guard overhead remains bounded for all operations`

本是正で 3 ファイルとも 1 行も触れておらず、失敗件数は既知の残赤を超えていない。

### 停止した逸脱

なし。本是正はユーザー裁定の範囲内(baseline 差し戻し + 挙動不変リファクタ)に収まっており、要件・設計からの逸脱は発生していない。上記「レビュー判断が必要な事項」1(OpenCode / Kiro IDE の native identity adapter 未実装)は 2026-07-25 のユーザー裁定でスコープ外化され、別 Issue へ切り出し予定(「ユーザー裁定: OpenCode / Kiro IDE の native identity adapter」節)。

---

## 是正: §12a レビュー iteration 1 指摘の反映(2026-07-25)

architecture-reviewer の iteration 1 verdict は NOT-READY。指摘4件を以下のとおり是正した。あわせて `origin/main`(92 コミット前進)を `--no-ff` でマージして再接地し、生成物を再生成した。

### Critical 1: 未 consume の `minted` reservation が host session の `HUMAN_TURN` を恒久抑止する

- **再現(scratch、repo 外)**: reservation を arm し、同一 host session で `mintHumanPresence` を 4 回呼ぶ。実測 `HUMAN_TURN` 総数はプロンプト1回目で baseline 1 → 2 に増えたのち、2〜4 回目はすべて **2 のまま**(delta 0)。すなわち 1 回目以外の人間ターンはどの intent にも `HUMAN_TURN` を1件も残さない。reservation は時間で expire せず、consume は targeted approval 成功時のみのため、その host session は以後どの human-presence gate も満たせなくなる。
- **機序(実測 file:line)**: `packages/framework/core/tools/amadeus-presence-reservation.ts:421` `mintHumanPresence` が capability `available` のとき `mintArmedPresenceReservation` を呼び、戻り値が `"none"` 以外なら return していた。`already-minted` の早期 return は `:274-276` で、`resolveTargetIntent`(`:278`)より手前にあるため target が complete/不正化しても解除されない。
- **設計との照合**: `functional-design/business-logic-model.md:56` の `| minted | duplicate/replayed prompt hook | minted | HUMAN_TURN delta 0 |` は、同表 `:54`(armed 行)が `HUMAN_TURN` を「owner audit へ Presence Reservation Id 付き exactly 1」と限定していることから、**owner-targeted な `HUMAN_TURN` の delta を指す**と読む。`business-rules.md:57` の HR-24 も「Presence Reservation Id 当たり owner `HUMAN_TURN` exactly 1」と owner 事象を数えており、Reservation Id を持たない untargeted append は数えない。よって「`already-minted` を通常 mint へ fall through させる」修正は HR-24 と HR-08(`HUMAN_TURN` requirement を弱めない)のいずれにも反しないと判断し、実装した(この抑止を意図仕様と読む根拠は設計側に見つからなかった。`:61` の「時間だけで expire させず」「session restart は同じ host session ID なら reservation を維持」はむしろ恒久抑止が意図されていないことを支持する)。
- **修正**: `packages/framework/core/tools/amadeus-presence-reservation.ts:437`(判定行)。早期 return を `reservation.kind === "minted"`(このターンで targeted mint した場合)だけに絞った。`:430-436` に根拠コメントを置いた。
- **回帰テスト**: `tests/integration/t-solo-gate-transaction-seam.test.ts:243` "keeps minting ordinary presence while a reservation is held" — 4 回の human prompt で `HUMAN_TURN` delta が 4 であること、かつ Reservation Id を持つ owner 事象は **1 件のまま**(HR-24)であることを同時に assert する。
- **落ちる実証**: 修正のみを `git stash push -m solo-grants-fix-proof` で退避して同 suite を実行 → `1 fail / 8 pass`、失敗は当該テストの `Expected: 4 / Received: 1`(exit 1)。`git stash pop` で復元後は `9 pass / 0 fail`(exit 0)。

### Major 1: HR-15 の test trace 証跡

§ Step 8 に FR-01–26 / NFR-01–08 の全数 trace 表を追加した(HR-21 / HR-23 の cursor switch 2 本を個別表で明示、6 harness の byte-identity 代表化の論拠も同節に記載)。各行は実在するテストの file:line とテスト名から導出し、行番号は本 worktree の HEAD で実測した。

### Major 2: ユーザー裁定と後続 Issue の記録

§「ユーザー裁定: OpenCode / Kiro IDE の native identity adapter(2026-07-25)」を追加した。

### Minor 1: 上流入力行の混入

冒頭行を stage 宣言の consumes 実測(`packages/framework/core/amadeus-common/stages/construction/code-generation.md:16-32`)に合わせ、produces(`code-generation-plan.md`)と非 consumes(`logical-components.md`)を「その他参照」へ分離した。

### Minor 2: file:line 引用の行ズレ

マージ後の HEAD で全引用を再測定し更新した。主な訂正: `amadeus-presence-reservation.ts` `384/390/404` → `401/407/421`、`:137-161` → `:137-159`、`:70-86` → `:73-75`、`:90-94` → `:93-97`;`amadeus-directive.ts` `:391-447` → `:391-442`、`:340-372` → `:358-382`;`amadeus-state.ts` `:2107-2212` → `:2108-2214`、`:2216-2233` → `:2223-2235`、`:642-655` → `:644-645`、flag 引用 `:3239-3242` → `:3248-3251`;`amadeus-orchestrate.ts` `:1589-1590` → `:1629-1630`、flag 引用 `:3151-3160` → `:3606-3607`;`amadeus-utility.ts` `:208-245` → `:209-424`、`:946` → `:947`;`amadeus-lib.ts:3929` → `:3851`;`amadeus-cursor-lib.ts:118-127` → `:111-122`;`t257-…:205-214` → `:205-215`。

### Minor 3: `tests/unit/t81.test.ts` の導出コメント

導出列に `#1424` の `INTENT_ARCHIVED` / `INTENT_UNARCHIVED`(+2)が欠落し、冒頭総計も `70` のまま据え置かれていた既存ドリフトを実数へ合わせた(§ Step 6 参照)。
