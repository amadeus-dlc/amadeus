# Code Summary 草稿 — unit autonomy-refusal-idem(Bolt 1 / FR-2 / #3152)

深度: Minimal(箇条書きのみ)。コミット: `38c1cc9239fc14ee78d0abc787189c521dc5755e`(worktree `/Users/j5ik2o/orca/workspaces/amadeus/bolt-pbb3-b1`、branch `bolt-pbb3-autonomy-refusal-idem`、base `origin/main` 89053172e)。

## 変更ファイル一覧

数値は `git diff --stat HEAD~1` からの転記(9 files changed, 379 insertions(+), 150 deletions(-)):

- `packages/framework/core/tools/amadeus-intent-autonomy-production.ts` — 133 行(+)
- `packages/framework/core/tools/amadeus-state.ts` — 70 行(+)
- `tests/integration/t482-autonomy-refusal-event.integration.test.ts` — 289 行(±)
- `tests/integration/t247-runtime-recovery.test.ts` — 23 行(±)
- `packages/framework/core/knowledge/amadeus-shared/audit-format.md` — 4 行(±)
- `packages/framework/core/otel/event-registry.ts` — 2 行(±)
- `docs/reference/12-state-machine.md` — 2 行(±)
- `docs/reference/12-state-machine.ja.md` — 2 行(±)
- `amadeus/spaces/default/specs/tla/model-map.json` — 4 行(±、実装ハッシュピン)

## 主要判断

- **発火点分離(ADR-2 決定)**: `productionStageAutonomy` から `emitAuthorizationRefusal` 呼出を除去し純粋読取化。`amadeus-orchestrate.ts:2822`(next)と `amadeus-state.ts` の approve 経路は無改変のまま台帳へ書かなくなる。
- **emit 点は「ゲート提示点」= `STAGE_AWAITING_APPROVAL` を発行する全サイト**。計画 Step 4 は `gateStartForTarget` を名指すが、契約5(行数 = 実提示回数)を満たすには gate-open 宣言点すべてが必要と判断し、3 サイトへ配置した(いずれも当該 verb の `operationWithLock` 内、AWAITING の直後):
  1. `gateStartForTarget` — 初回のゲート開設
  2. `reviseForTarget` — reject 後の正当な再提示([R] → [?])
  3. `rejectForTarget` の `gateWasMissing` バックフィル — gate-start を経ずに reject された提示
  述語の複製を避けるため、3 サイトとも `recordGateOpenRefusal(pd, content, slug)` の 1 関数を呼ぶ。occurrence 座標の解決も `stageAutonomyInputFor` の 1 関数へ集約し、approve 経路(`assertHumanPresentForGateResolution`)も同関数を使うよう置き換えた(approve と gate-open が同じ occurrence を指すことを構成的に保証)。
- **occurrence 境界の定義(契約5)**: 冪等鍵の**提示エポック** = 当該 stage の `GATE_APPROVED` + `GATE_REJECTED` の件数(= そのゲートが既に何回「解決」されたか)。根拠と成立条件:
  - (a) ゲート未開設 → emit 経路自体に到達しないので 0 行。
  - (b) 同一提示エポック内 → 未解決のまま再度開かれた提示(gate-start の再実行、`--recovered` バックフィル)は解決件数が変わらないため同一鍵になり、shard 内既存行の検査で skip される。retry(next / approve の読取)は emit しないので混入しない。
  - (c) 行数 = 実提示回数 → 提示は解決で閉じるので、エポックが進むのは「人間が一度答えた後の再提示」だけ。よって行数 = 人間を止めた回数と一致する。
  - 代替案として検討した「STAGE_AWAITING_APPROVAL の shard 内序数」をエポックにする案は却下した — 各 gate-open が必ず AWAITING を 1 行足すため dedup 述語が構造的に発火せず(検証劇場になる)、s2 が実測した「再 gate-start / backfill の漏れ経路」を閉じない。
- **鍵生成は 1 関数へ集約**(`refusalIdempotencyKey`、ADR-2 契約1): `occurrenceId`(intentUuid / kind / stage / phase / bolt / interactionId / optionIds / graphRevision を内包)+ `selector`(occurrenceId が持たないため明示追加)+ `mode` + `graphRevision` + 提示エポック。様式は UNIT_POOL の replay(`amadeus-unit-pool-runtime.ts:236-237`)と同型で、intent 自身の shard 内のみを検査(cross-clone 一意性は主張しない)。
- **dedup 読取失敗は fail-open**: `readAllAuditShards` は読めない shard を黙って飛ばすため一致なし → emit する(重複しうるが、読取失敗が記録を抑止することはない)。recorder 全体も try/catch でくるみ、ゲート開設が本行のせいで失敗することはない。
- **選択 Intent への経路(実装中に検出した欠陥の是正)**: 初版は `resolveIntent(projectDir)` と `emitAuditEvent(..., projectDir)` を使い active cursor 経由で解決していたため、`--intent` 選択や予約オーナー Intent へのゲート開設で**別 record の shard に書き込む**ことが t365 の既存テストで赤として顕在化した。recorder は `intent` / `space` / `stateContent` を呼び出し側から受け取る形へ変更し、`amadeus-state.ts` 側は `emitAudit` と同じ `stateOperationTarget` を渡す。
- **監査契約**: `INTENT_AUTONOMY_HUMAN_REQUIRED` の required attributes へ `Idempotency Key` を追加(`event-registry.ts`、UNIT_OUTCOME_SETTLED と同表記)。`audit-format.md` の行と説明段落、`docs/reference/12-state-machine.md` / `.ja.md` の説明を同一変更で同期(audit-format.md に ja 版は存在しない)。イベント基数の変更なし。
- **後方互換シム・フォールバック分岐・二重実装は追加していない**(旧 emit 経路は削除して置換)。

## テストカバレッジ(Red → Green の実測)

Red は未改変の production コード(`origin/main` 89053172e 断面)に対し、本 unit のテストのみを適用して測定。

- Red コマンド: `bun test tests/integration/t482-autonomy-refusal-event.integration.test.ts` → **exit 1**(7 tests: 1 pass / 6 fail)。ログ: `scratchpad/b1/red-t482.log`
  - 落ちる実証 (a) ゲート未開設の `next` ×5: 期待 0 行 → **実測 5 行**(受信側 diff の `INTENT_AUTONOMY_HUMAN_REQUIRED` 出現数を `grep -c` で転記)
  - 同 (a′) in-process 読取 ×5(`productionStageAutonomy`): 期待 0 行 → **実測 5 行**
  - 落ちる実証 (b) 1 提示内の再 gate-start + 読取の混合: 期待 1 行 → **実測 3 行**
  - gate-open 時の理由記録(mode none / semi phase-gate): 期待 1 行 → **実測 0 行**(当時は gate-open で emit しない)
  - occurrence 境界(reject → revise): 期待 2 行 → **実測 0 行**
- Green コマンド: 同上 → **exit 0**(10 tests: 10 pass / 0 fail)。ログ: `scratchpad/b1/final-t482-autonomy-refusal-event.integration.test.ts.log`
- 追加したテスト(t482、計 10 本): 理由記録 3 本(MODE_REQUIRES_HUMAN / SCOPE_OUT / semi 自動裁定は 0 行)、読取の純粋性 2 本(実 CLI `next` ×5 / in-process ×5)、1 提示 1 行 3 本(同一エポック collapse / reject バックフィル / reject→revise の新 occurrence)、fail-open のエラーパス 2 本(active intent 不在 / occurrence 構築不能)。
- 既存テスト追従: `t247-runtime-recovery.integration` の 3 箇所(パラメータ化により 7 test に波及)で、approve 経路が append する行の期待を `["INTENT_AUTONOMY_HUMAN_REQUIRED"]` → `[]` へ更新(approve は読取のみになったため)。`t435` / `t3116` は emit 期待を持たず無改変で green。`t115` の `STAGE_AWAITING_APPROVAL INTENT_AUTONOMY_HUMAN_REQUIRED GATE_APPROVED ...` 系列は emit 位置が AWAITING 直後へ移ったため順序不変で green。
- 検証(worktree 内、いずれも exit code 実測): `bun run typecheck` = 0 / `bun run lint` = 0(warning 470 件は base と同一、base も exit 0)/ `bun run build` = 0 / t482 = 0 / t435 = 0 / t3116 = 0 / t247(integration)= 0 / t115 = 0 / t365 = 0 / t45-revision-loop = 0 / 台帳ガード群(t534 / t535 allowlist / t535-tla-referee / formal-verif model-completeness ×2)= 0 / `bun tests/gen-coverage-registry.ts --check` = 0。
- 帰属の切り分け: 6 ファイル同時実行時のみ `t247 > a completed recovery batch cannot authorize a newer organic gate` が赤くなるが、**未改変 base(git stash + `bun run build` で同一条件を再現)でも同一 1 件が赤**であることを実測済み(`scratchpad/b1/combined-base.log`)。自変更由来ではない既存のクロスファイル干渉。単独実行では base / 本変更ともに green。
- フルスイートは未実行(push-first — リモート CI を正とする)。

## 台帳 resync

- model-map 実装ハッシュピン: `bun plugins/formal-model-check/tools/amadeus-sensor-model-completeness.ts updateModelMap --impl-only` → `{"ok":true,"code":"IMPL_ONLY_UPDATED",...,"changed":[{"implPath":"packages/framework/core/tools/amadeus-state.ts","from":"66bae0bdb82f","to":"33378c82d94b"}]}`(exit 0、最終実行分)。formal-verif model-completeness テストは SOURCE_DRIFT なしで green。
- `tests/.coverage-patch-allowlist.json`: 意味的セレクタの再アンカーは**不要**だった(t534 / t535 / t536 / t537 がすべて green — 変更後の `assertHumanPresentForGateResolution` でも fingerprint / anchorLines が一致)。
- `tests/.coverage-registry.json`: 新規テストファイルの追加なし(t482 は既存ファイルの書き換え)。`--check` は `coverage registry: OK (fresh, guards green, ratchet held)` で exit 0、regen 不要。

## 計画からの逸脱

- **Step 4 の emit サイトを 1 → 3 へ拡張**。計画本文は `gateStartForTarget` のみを名指すが、指令の occurrence 境界要件 (c)「行数 = 実提示回数」は `revise`(reject 後の再提示)と reject のゲートバックフィルを含めないと成立しない(gate-start を経ない提示が無記録になる)。ADR-2 の決定文「宣言の emit は gate-start(`STAGE_AWAITING_APPROVAL` 発行と同一 operationWithLock 内)で明示的に行う」を「gate-open 宣言点で明示的に行う」として同一の趣旨で適用したもので、方式(発火点分離 + 冪等鍵)そのものの変更ではない。共有関数 1 本に集約しており述語の複製はない。**conductor のレビュー対象として明示的に申告する。**
- それ以外の逸脱なし(Step 1-10 すべて完了)。
