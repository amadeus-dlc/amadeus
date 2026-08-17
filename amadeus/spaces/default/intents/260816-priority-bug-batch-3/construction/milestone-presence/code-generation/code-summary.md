# Code Summary 草稿 — unit milestone-presence(Bolt 2 / FR-1 / #3153、P1/S2)

深度: Minimal(箇条書きのみ)。コミット: `97345f44c`(worktree `/Users/j5ik2o/orca/workspaces/amadeus/bolt-pbb3-b2`、branch `bolt-pbb3-milestone-presence`、base = Bolt 1 の record bundle `73d436b7c`)。

## 変更ファイル一覧

数値は `git diff --stat HEAD~1` からの転記(15 files changed, 420 insertions(+), 43 deletions(-)):

- `packages/framework/core/tools/amadeus-lib.ts` — 113 行(±)
- `packages/framework/core/tools/amadeus-state.ts` — 80 行(±)
- `packages/framework/core/tools/amadeus-intent-autonomy-production.ts` — 15 行(±)
- `packages/framework/core/tools/amadeus-intent-autonomy.ts` — 7 行(+)
- `tests/unit/t188-human-presence-gate.test.ts` — 154 行(±)
- `tests/unit/t112-delegated-approval.test.ts` — 32 行(+)
- `tests/integration/t435-intent-autonomy-production.integration.test.ts` — 28 行(±)
- `packages/framework/core/otel/event-registry.ts` — 2 行(±)
- `packages/framework/core/knowledge/amadeus-shared/audit-format.md` — 2 行(±)
- `docs/reference/12-state-machine.md` / `.ja.md` — 各 2 行(±)
- `amadeus/spaces/default/specs/tla/model-map.json` — 4 行(±、実装ハッシュピン)
- `tests/.coverage-patch-allowlist.json` — 2 行(±、セレクタ再アンカー 1 件)
- `tests/.coverage-registry.json` / `.coverage-ratchet.json` — 18 / 2 行(±、regen)

## 主要判断

- **境界分岐の所在(ADR-1 契約1)**: `scanPresenceLedger`(amadeus-lib.ts)へ `STAGE_AWAITING_APPROVAL` を Stage + `Recovered` 付きの境界イベントとして1分岐追加(`PresenceEvent.gateOpen`)。既存の述語はすべて `.human` / `.res` / `.delegVerb` で絞るため、この追加イベントは他の全 consumer に対して不活性。判定は `resolveGateResolutionPresence` 1本に集約し、milestone のときだけローカル HUMAN_TURN スロットの `isResolution` に「当該 stage の organic gate-open」を足す(= その gate-open より前のターンは消費済み扱い)。第2のスキャンも第2の比較述語も書いていない — 順序判定は既存の `auditBlockIsAfter`(モジュール唯一の append-order 定義)のみを通る。
- **`humanActedSinceGate` の verb 分岐を同じ関数へ委譲**: `resolveGateResolutionPresence(pd, verb, null, ...)` が verb 分岐そのものになるよう書き換え、milestone 版は同じ呼び出しに stage を渡すだけ。narrowing が narrow 対象の述語からドリフトしえない形にした(cg2-agreeing-predicate-drift)。
- **`interactionKind` の供給(契約2)**: `ProductionAutonomyContext` に `interactionKind` と `humanRequired` を追加し、`productionStageAutonomy` の既存 `interactionKind()` / `authorizeProductionOccurrence()` の答えをそのまま公開。amadeus-state.ts 側では再計算しない。milestone の判定は `amadeus-intent-autonomy.ts` の既存 `SEMI_HUMAN_MILESTONES`(「the only place the pair is named」)から `isMilestoneInteraction()` を export して共有 — 対を書き写していない。
- **backfill fail-closed(契約3)**: `--recovered` の gate-open は境界にならない(`opensGateFor` が除外)。当該 stage に organic gate-open が 1 件も無ければ `gate-open-missing` を返し、緩い境界へ fallback せず `gate-start "<slug>" して再提示せよ` と指示するメッセージで拒否。
- **provenance 4値の導出点(契約4)**: `assertHumanPresentForGateResolution` の実行分岐から導出 — autonomy auto-approve → `intent-grant` / `humanPresenceGuardDisabled()` → `guard-disabled` / ローカル HUMAN_TURN スロット → `gate-open-turn` / 委譲スロット → `delegated`。`ApprovalAuthorization.provenance` を経由して `emitApprovalAudit` が `GATE_APPROVED` に `Approval Provenance` として stamp。`AMADEUS_SKIP_HUMAN_PRESENCE_GUARD` は正直に `guard-disabled` を記録する。`event-registry.ts` の optionalAttributes、`audit-format.md:150`(既存の `Presence Reservation Id` 欠落 drift も同時是正)、`docs/reference/12-state-machine.md` / `.ja.md` を同一変更で同期。イベント基数は不変。
- **approve-batch 射程外(契約5)と #1647 申し送り文面**: 「approve-batch 経路(`verifyBatchApprovalPresence` — verb-less 述語)は本変更の射程外である。milestone ゲートが `approve-batch` で解決されうる場合、当該経路には gate-open 境界も provenance stamp も適用されず、別目的の未消費 HUMAN_TURN 1 件での承認が残存しうる。approve-batch へ presence guard の milestone 境界を入れるか否かは仕様判断であり Issue #1647 へ申し送る。」
- **後方互換シム・フォールバック分岐・二重実装は追加していない**。reservation 機構(`amadeus-presence-reservation.ts`)は無改変。

## 逸脱・要レビュー申告(P3)

1. **「`humanTurnIsFresh` と同一定義を1箇所で共有」の解釈**: 指令とADR-1契約2は「境界セマンティクスを `humanTurnIsFresh`(`humanAt >= latestGateAt`、Stage 一致)と1箇所で共有」と述べるが、契約1は「`scanPresenceLedger` + `PresenceSlot` + 既存の同秒タイ fail-closed 規則の再利用」を求め、指令は reservation 機構の変更を禁じている。両者はタイ(HUMAN_TURN と gate-open が同一秒)でのみ食い違う — `humanTurnIsFresh` は fresh 側、ledger の `auditBlockIsAfter` は shard 内 append 順で決着し cross-shard 同秒は fail-closed。**契約1を機構の指定、契約2を境界の指定(= 当該 stage の最新 `STAGE_AWAITING_APPROVAL`)として読み、機構は契約1のとおり実装した**(コード上のコメントで humanTurnIsFresh を明示参照)。reservation 側へ関数を共有する形は (a) 禁止された reservation 機構の変更になるか (b) milestone 側を timestamp のみの粗い比較へ落として契約1に反するため、採らなかった。両契約を同時に満たす唯一の読みだと判断したが、裁定を要する場合は差し戻し対象。
2. **narrowing の射程を `verb === "approve"` に限定**: FR-1 / ADR-1 Decision の文言が「承認」であること、reject 側へ広げると reject 経路に autonomy projection 読取を新設することになるため。reject は prior-resolution 境界のまま。
3. **委譲スロット(`delegated`)は narrowing しない**: #3153 は未消費 HUMAN_TURN の穴であり、`DELEGATED_APPROVAL` は発行元 HUMAN_TURN に紐づく別機構(#671/#685)。narrowing を広げると当該フローの挙動が変わるため対象外とした。
4. **`Approval Provenance` は override 経路と recovered batch 経路には付かない**: 前者(targeted approval / presence reservation)は `assertHumanPresentForGateResolution` を通らず、後者は `buildRecoveredApprovalBatch` の検証済みバッチ形状のため。`provenance: null` としてフィールドを出さない(4値は「実行された分岐」のみを名乗る)。
5. **walking-skeleton の end-to-end 駆動は未実施**: narrowing の end-to-end は phase-gate で駆動し、walking-skeleton は同一の `isMilestoneInteraction` 分類を通るため、分類側を t188 の M0 で両 kind pin した。

## テストカバレッジ(Red → Green の実測)

- **Red コマンド**: `bun test tests/unit/t188-human-presence-gate.test.ts -t "milestone gate presence"`(未改変 production コード = HEAD `73d436b7c` に本 unit のテストのみ適用)→ **exit 1**(0 pass / 3 fail)。ログ: `scratchpad/b2/red-t188.log`
  - Red 3点(1テスト `M` 内、受理側を先に実行して片側 assert を避けた):
    - (ii) 通常 stage-gate(`feasibility`)、HUMAN_TURN → gate-start → approve: **exit 0 で承認**(未改変断面で green = 非退行の対照)
    - (iii) milestone(`approval-handoff` = phase-gate)、gate-start → HUMAN_TURN → approve: **exit 0 で承認**(未改変断面で green)
    - (i) 同一 fixture の milestone、HUMAN_TURN → gate-start → approve: 期待 = 拒否 → **実測 exit 0(承認された)** ← #3153 の空振り。失敗地点は t188:402 の `expect(refused.rc).not.toBe(0)`
  - `M2`(gate-open 不在 / `--recovered` backfill のみ)→ 現行は exit 0(t188:423)
  - `M3`(`Approval Provenance`)→ 現行はフィールド不在(実測 `""`、t188:450)
- **Green コマンド**: `bun test tests/unit/t188-human-presence-gate.test.ts` → **exit 0**(26 pass / 0 fail)。ログ: `scratchpad/b2/green-t188.log`
- **非退行の証拠**: t188 の既存 22 テストは**一切書き換えていない** — `git diff HEAD~1 --numstat` = `152 2`、削除 2 行の実体は `git diff HEAD~1 | grep '^-[^-]'` の転記で covers ヘッダ 1 行と `amadeus-lib.ts` の import 1 行のみ(いずれも同一変更内で拡張して再追加)。テスト本体の削除・書き換えは 0 行。既存の一般ゲート presence シナリオ(A/B/C/C2/D/E/F/G、reject guard、cross-intent #2588)は無改変で green。
- **追加したテスト**: t188 に 4 本(M = Red 3点 pin、M0 = milestone kind 分類の両側 pin、M2 = gate-open 不在 / backfill-only の fail-closed 2 面、M3 = provenance `gate-open-turn` / `guard-disabled`)、t112 に 1 本(`delegated` provenance + verb wall)、t435 は既存テストへ 2 assertion 追加(context の `interactionKind` / `humanRequired`、semi 経路の `intent-grant` provenance)。
- **検証(worktree 内、いずれも exit code 実測)**: `bun run typecheck` = 0 / `bun run lint` = 0(出力転記: `Found 472 warnings. / Found 21 infos.` — base 断面での警告数は未測定)/ `bun run build` = 0 / t188 = 0(26 pass)/ t112-delegated-approval = 0(28 pass)/ t208-presence-crossshard-tiebreak = 0(8 pass)/ t-delegate-answer-consume = 0(15 pass)/ t509-presence-legacy-shard = 0(7 pass)/ t482-autonomy-refusal-event = 0(10 pass、Bolt 1 面の非破壊)/ t435 = 0(14 pass)/ t3116 = 0 / t247-runtime-recovery = 0(27 pass)/ t45-revision-loop = 0 / t48-audit-event-emitters = 0 / t381-registry-emitter-parity = 0 / t115 = 0 / t365-journal-reader-swap = 0 / t390-migration-equivalence = 0 / t49・t51・t91・t136・t145・t404・t486・t487・t490・t511・t389・t210・t-solo-gate-transaction(-prefix)・t380・t365-kimi・t-docs-only = すべて 0 / 台帳ガード群(t534 allowlist / t535 allowlist / t536 / t537 / t534-tla-referee / t535-tla-referee / formal-verif 全 41 ファイル)= すべて 0 / `bun tests/gen-coverage-registry.ts --check` = 0。
- **フルスイートは未実行**(push-first — リモート CI を正とする)。
- **帰属の切り分け(既存赤)**: 単独実行で赤くなる 3 ファイルは、`git stash` + `bun run build` で未改変 base を再現して**同一の赤**を実測済み。(a) `tests/unit/t33.test.ts` — approve-batch 4 件が base でも同一に fail(`scratchpad/b2/base-t33.log`、31 pass / 4 fail、本変更適用時も 31 pass / 4 fail)。(b) `tests/integration/t507-approve-batch-idempotent.integration.test.ts` と (c) `tests/integration/t-approve-batch-presence-guard.integration.test.ts` — 単独実行時の `OTel logs already bootstrapped ... one workspace per process` により base でも同一に fail。いずれも自変更由来ではない。

## 実 record への副作用(要 conductor 確認)

- 上記 (b)(c) の単独実行が、**本 intent の実 record へ audit 行を書き込んだ**(`amadeus/spaces/default/intents/260816-priority-bug-batch-3/audit/j5ik2o-mac-studio-lan-b254a848f5f8.jsonl`、新規 per-clone shard、4 行すべて `amadeus.operation.failed` / `Command: amadeus-bolt` / `Refusing to approve-batch: no human presence recorded...`)。うち 2 行(seq 3-4)は **base ablation 実行**由来なので、本変更とは無関係な既存のテスト隔離欠陥(`cid:code-generation:c2-env-isolation-seam-inventory` と同族)。ワークフロー履歴ではなくテスト流出であるため、コミットへ含めず**ファイルを削除して実行前の状態へ戻した**(このシャードは以前どのコミットにも存在せず、conductor record 側にも同名ファイルは無い — 実測: `git log -- <path>` 0 件、`ls` で conductor record の 5 シャードに非該当)。worktree は clean。

## 台帳 resync

- model-map 実装ハッシュピン: `bun plugins/formal-model-check/tools/amadeus-sensor-model-completeness.ts updateModelMap --impl-only` → `{"ok":true,"code":"IMPL_ONLY_UPDATED","changed":[{"implPath":"packages/framework/core/tools/amadeus-state.ts","from":"33378c82d94b","to":"d51846c3241a"}]}`(exit 0)。formal-verif 系は SOURCE_DRIFT なしで green。
- `tests/.coverage-patch-allowlist.json`: `assertHumanPresentForGateResolution` の意味的セレクタ 3 件中 **1 件のみ**再アンカー(`sha256:3ee6cf2d…` → `sha256:7a316789…`、`return decision.grantId;` → `return { grantId: decision.grantId, provenance: "intent-grant" };` の行変更による)。残り 2 件は anchor 本文が不変のため fingerprint も不変。再アンカーは gate 自身の `createSemanticSelector` で生成し、3 件とも**変更前と同一の文**へ解決すること・**span 幅が 3/2/1 行のまま膨張していないこと**を再実行で照合済み(`scratchpad/b2/resolve.ts` を base / 現行の両断面へ適用)。
- `tests/.coverage-registry.json` / `.coverage-ratchet.json`: 新規 export `resolveGateResolutionPresence` により enumerated universe が 633 → 634 へ。t188 の `covers:` ヘッダへ `function:resolveGateResolutionPresence` と `function:isMilestoneInteraction` を追加して `bun tests/gen-coverage-registry.ts` で regen(function covered 188 → 189)。`--check` = `coverage registry: OK (fresh, guards green, ratchet held)`、exit 0。

## 計画からの逸脱

- Step 1-9 すべて完了。手順上の逸脱なし。実装契約の解釈・射程についての申告は上記「逸脱・要レビュー申告」1-5 を参照(1 が唯一の裁定要求事項)。
