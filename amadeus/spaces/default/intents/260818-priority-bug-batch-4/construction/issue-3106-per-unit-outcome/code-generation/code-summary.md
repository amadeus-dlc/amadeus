# Code Summary — issue-3106-per-unit-outcome(Bolt 2)

Intent: 260818-priority-bug-batch-4 / Unit: issue-3106-per-unit-outcome / depth Minimal / TDD 必須

上流: `code-generation-plan.md`(11 step)、`../../../inception/application-design/decisions.md` ADR-2 実装契約 1〜9、`../../../inception/requirements-analysis/requirements.md` FR-3106-1〜4、`../../../ideation/intent-capture/issue-evidence.md` #3106 節(reviewer-1 の再現手順5段、reviewer-2 SR1〜SR3)。

測定断面: worktree `bolt-pbb4-b2`(branch `bolt-pbb4-per-unit-outcome`、base `origin/main` `cd905b05d`)。以下の実測値はすべて本 tree でのコマンド出力からの転記。exit code は `echo $?` の転記。

## 変更ファイル

- `packages/framework/core/tools/amadeus-orchestrate.ts` — 閉語彙 `SETTLED_UNIT_OUTCOMES`(3値)+ `isSettledUnitOutcome`、`perUnitOutcomeTriple` / `perUnitOutcomeKey(…, revision)`、`readSettledUnitOutcomes` の受理拡張と決定的整列(`compareSettledRows`)、`observedUnitOutcome`(cancelled 優先・coverage は succeeded arm 専用)、`batchIdentityOfUnits` / `settledOutcomeHistory` 抽出、`settlePerUnitOutcomes` の supersession 化。`readPerUnitConsumePopulation` は**コード無変更**(採択規則のコメント追記のみ)
- `tests/integration/t533-per-unit-consume-fanout.integration.test.ts` — fixture ヘルパ 2 本(`seedSoloFailure` / `cancelSoloUnitThroughRuling` — cancel は実 CLI `resolve-failure --user-input Skip` で駆動)+ テスト 4 本(下表 R1/R2/R3/C1)
- `docs/guide/15-troubleshooting.md` / `.ja.md` — 既知限界段落を実挙動へ差し替え、回復手順 step 3 の「covered かつ未キャンセル」を訂正(英日同一変更)
- `docs/reference/12-state-machine.md` / `.ja.md` — `UNIT_OUTCOME_SETTLED` 行の説明(3値・revision 鍵)を同期
- `packages/framework/core/knowledge/amadeus-shared/audit-format.md` — 同イベントの散文と一覧表を同期(閉語彙・failed arm 不在・revision・last-row 採択)
- 台帳: `amadeus/spaces/default/specs/tla/model-map.json`(impl hash pin、`--impl-only`)

不変(ADR-2 契約が要求): `amadeus-per-unit-consume-fanout.ts`(`KNOWN_OUTCOMES` を含め無変更)、`amadeus-construction-outcome-projection.ts`(観測源として読むのみ)、pool coordinator(発生点で pool event を書かない)。

## failed arm の採否 — **採らない**(ADR-2 契約5、FR-3106-1(b) の「採らない裁定」)

**根拠は実測**。per-unit 経路で `failed` terminal を持つ Unit は settle 到達前に `next` が止まる。

- 実測1(producer stage): fixture に solo 相関の `BOLT_STARTED` + `BOLT_FAILED`(`Batch Id: solo:1:unit-z`)を置き、`code-generation` で `next` → **exit 0 / directive kind `ask`**、question 逐語 `Unit "unit-z" failed during code-generation (attempt attempt-unit-z, batch solo:1:unit-z; siblings: none). Choose exactly one: Retry, Skip, or Abort. …`、`UNIT_OUTCOME_SETTLED` 行 **0 件**
- 実測2(consumer stage、同 fixture): カーソルを `build-and-test` へ移して `next` → **exit 1** / stderr 逐語 `amadeus-orchestrate: producer-outcome-pending: unit-z, unit-a`。unit-a まで pending なのは settle 自体が一度も走っていないため(= failed unit 単独の診断面ではない)
- 実測3(Abort 経路): `resolve-failure --user-input Abort` → exit 0 / `parked`。以後 `next` → exit 0 / `parked`、`next --resume` → exit 0 / `ask`(既存ワークフロー再開プロンプト)。いずれの断面でも `UNIT_OUTCOME_SETTLED` は 0 件
- 機序(コード実読、上記を説明する): solo の `BOLT_FAILED` は正規化の同一分岐で terminal(`outcome: failed`)と closure(`SWARM_BATON_RETURNED`)を**同時に**書く(`amadeus-construction-outcome-projection.ts` normalizeFailureOrBaton)。したがって常に `unresolvedFailures` に入り、`failureOutsideRuntimePopulation` の数値 batch 述語 `^[1-9][0-9]*$` は `solo:1:unit-z` を歴史扱いにできない。結果 `emitConstructionFailureIfPresent(pd, <当該 stage>)` が `await-unit-ruling` を返して return し、同じ stage スコープで走る `settlePerUnitOutcomes` に到達しない。ruling の出口は Retry(BOLT_STARTED が terminal を削除)/ Skip(cancelled へ遷移)/ Abort(parked)の3つで、「failed のまま settle される」系列は存在しない
- 判断: 到達不能な arm への emit 実装とそのテストは**テスト劇場**になるため実装しない。ADR-2 契約1 が課す「ちょうど3値の閉語彙」は**維持**する — reader は `failed` を受理し(下記 R3)、`failed` は consumer を止める方向にしか効かないため「編集された台帳が consumer を**走らせる**ことはできない」保証は不変
- 到達不能を回帰で固定: テスト C1「stops at the failure ruling instead of settling a failed Unit on the per-unit path」(base でも修正後でも green の characterization)

## supersession 規則(ADR-2 契約4)

- **冪等鍵**: `perUnitOutcomeKey(stage, unit, batch, revision)` = revision 1 は `"<stage> <unit> <batch>"`(#3099 と byte 同一)、revision n>1 は `"<stage> <unit> <batch> #<n>"`。revision は当該 triple の既存行数 + 1
- **emit 条件**: 「観測値が triple の**最後の行**と異なるとき」。同一なら追記しない(再入で行が増えない性質は不変)。旧実装の「鍵が既出なら追記しない」では cancelled 行の後に再実行・再成功が来ても上書きできなかった
- **reader の採択規則**: `readSettledUnitOutcomes` が (timestamp 昇順 → Idempotency Key の辞書順) で整列し、母集団は unit ごとに**最後の行**を採る。両項とも行自身が持つ値のみで、`readAllAuditShards` の shard ファイル名順(= buffer 位置)に依存しない。1 回の `next` は 1 つの triple を高々1行しか settle しないため、同一 triple の 2 revision は必ずプロセス境界すなわち timestamp で分離される。key 順は「同一 run が同一ミリ秒で settle した別 Unit 同士」の tie にしか効かず、その相対順を読む consumer はいない
- **round-trip 固定**: R2(cancel → `amadeus-bolt.ts start` 再入 → next → 成功)で、台帳 3 行(`unit-a 1`=succeeded / `unit-z 1`=cancelled / `unit-z 1 #2`=succeeded)と母集団 2 行(unit ごと 1 行、unit-z は succeeded)を同時に固定。ADR-2 契約3 の「同一 unit が 2 行にならない」も同テストが assert
- **契約3 の逐語保存**: 数値 batch join(`amadeus-orchestrate.ts:2570` の `foldUnitPoolEventSets(eventSets, String(index + 1))` / `:2597` の `row.batch !== String(index + 1)`)と pool 優先 de-dup(`:2594` の `pooled` 構築 + `:2598` の `pooled.has(row.unit)`)は**コード無変更**。既存テスト「keeps the pool's verdict when a Unit carries both a pool terminal and an engine outcome」が green のまま

## E-260815-3099 系裁定との関係(ADR-2 契約7)

`Outcome: succeeded` 限定は E-260815-3099-C-FORM が拘束した発行点(coverage 成立境界)ではなく、#3105 実装時の判断であった。FIX-METHOD subagent-1 留保「根拠が足りないと実装時に判断される場合はその場で緩めず再裁定へ戻すこと」に対し、**本 unit の緩和は ADR-2 の選挙裁定(q2 = A、2-0)という再裁定に基づく**。無申告の上書きではない。C-FORM が拘束した succeeded arm の発行点(unitCovered true 遷移時)は本変更でも不変で、cancelled arm は canonical projection という固有の観測境界を持つ拡張である。

## Red / Green 証跡(実測)

Red は **dist 断面 = base** で測定。`git show HEAD:packages/framework/core/tools/amadeus-orchestrate.ts` と `dist/claude/.claude/tools/amadeus-orchestrate.ts` の `diff -q` → **exit 0**(fixture は dist を複製するため、この確認なしでは stale dist で測ることになる)。R3 は実装後に base 版 orchestrate を dist へ一時差し戻して測定し、測定後に復元して `diff -q` → exit 0 を確認。

| # | 内容 | コマンド | Red | Green |
|---|---|---|---|---|
| R1 | cancelled unit の consumer 停止(FR-3106-1(a) / FR-3106-2) | `bun test tests/integration/t533-per-unit-consume-fanout.integration.test.ts -t "does not emit paths for a Unit cancelled on the per-unit path"` | **exit 1** / 0 pass 1 fail、stderr 逐語 `amadeus-orchestrate: producer-outcome-pending: unit-z` | exit 0 |
| R2 | supersession round-trip(ADR-2 契約4) | 同ファイル `-t "supersedes a cancelled Unit"` | **exit 1** / 0 pass 1 fail、台帳に `["code-generation unit-z 1","cancelled"]` が不在 | exit 0 |
| R3 | 閉語彙3値の受理(ADR-2 契約1) | 同ファイル `-t "reads the third settled outcome"` | **exit 1** / 0 pass 1 fail、Received 逐語 `amadeus-orchestrate: invalid-unit-outcome-audit-row: not the shape the engine writes` | exit 0(stderr `producer-outcome-failed: unit-z`) |
| C1 | failed arm 到達不能の characterization | 同ファイル `-t "stops at the failure ruling"` | — (base でも **exit 0** / 1 pass) | exit 0 |

- baseline(テスト追加前): `bun test tests/integration/t533-per-unit-consume-fanout.integration.test.ts` → **22 pass / 0 fail**
- Green(全体): 同コマンド → **exit 0 / 26 pass / 0 fail / 271 expect() calls**
- 関連スイート: `bun test tests/unit/t28-audit-event-sync.test.ts tests/unit/t15-knowledge-file-inventory.test.ts tests/unit/t81.test.ts tests/unit/t533-per-unit-consume-fanout.test.ts tests/integration/t48-audit-event-emitters.test.ts tests/integration/t52-drift-meta-validation.test.ts tests/integration/t47-construction-bolts.test.ts` → **exit 0 / 76 pass / 0 fail**

## ゲート・台帳(実測)

| 検査 | コマンド | 結果 |
|---|---|---|
| 型検査 | `bun run typecheck` | exit 0 |
| lint | `bun run lint` | exit 0。変更2ファイルへの `npx biome check` 単独実行は base **13 warnings** / 実装後 **13 warnings**(一旦 14 に増えた `settlePerUnitOutcomes` の cognitive complexity 警告は helper 抽出で解消) |
| 複雑度ゲート | `bun tests/complexity-gate.ts --check` | exit 0、逐語 `complexity gate: OK — 0 new violations, 0 regressions, baseline 32 entries (worst CCN 38), threshold 15`。`settlePerUnitOutcomes` は一旦 CCN 15(閾値ぎりぎり)になったため `batchIdentityOfUnits` / `settledOutcomeHistory` を抽出し、警告帯(CCN 11 以上)の列挙から消滅 |
| coverage registry | `bun tests/gen-coverage-registry.ts --check` | exit 0、逐語 `coverage registry: OK (fresh, guards green, ratchet held)`(新規テストファイル無しのため regen 不要) |
| model-map | `bun plugins/formal-model-check/tools/amadeus-sensor-model-completeness.ts updateModelMap --impl-only` | exit 0、`IMPL_ONLY_UPDATED` — `amadeus-orchestrate.ts` の impl hash `cd9b3baa92a0` → `b36054a23db0` |
| allowlist | `grep -n "settlePerUnitOutcomes\|readSettledUnitOutcomes\|perUnitOutcomeKey\|readPerUnitConsumePopulation\|observedUnitOutcome" tests/.coverage-patch-allowlist.json` | 0 hit(該当エントリ無し)→ 再アンカー不要 |
| build | `bun run build` | exit 0 |
| source-only 境界 | `bun run source-only:check` | exit 0、逐語 `source-only boundary: clean` |
| 配布検査 | `bun run distribution:check` | exit 0(`mirror-distribution-check: OK (444 payloads…)` / `mirror-docs-contract: OK (4 documents, 44 topics)` / `scan-public-projections: OK (448 files)`) |

## docs 受け入れ(FR-3106-4、grep + exit code)

| # | 述語 | 結果 |
|---|---|---|
| A1 | `git grep -n -F "Cancelled Units are not settled" -- .` | 0 hit / **exit 1** |
| A2 | `git grep -n -F "cancel された Unit は確定されません" -- .` | 0 hit / **exit 1** |
| A3 | `git grep -c -F "Cancelled Units are settled too" -- docs/guide/15-troubleshooting.md` | **1** / exit 0 |
| A4 | `git grep -c -F "cancel された Unit も確定されます" -- docs/guide/15-troubleshooting.ja.md` | **1** / exit 0 |
| A5 | `grep -rn -F -e "Cancelled Units are not settled" -e "cancel された Unit は確定されません" dist .claude` | 0 hit / **exit 1**(配送先ツリー) |
| A6 | `grep -rc -F "closed set of three" dist/claude/.claude/knowledge/amadeus-shared/audit-format.md .claude/knowledge/amadeus-shared/audit-format.md` | 各 **1** / exit 0(配送先ツリー) |

`.ja.md` は「同一文字列 0 hit」の申し送りどおり逐語訳ではなかったため、実文言(`docs/guide/15-troubleshooting.ja.md:143` の「**cancel された Unit は確定されません。**」)を実読特定してから同一変更で同期した。

## 残余(ADR-2 契約8)

- **2 読み口の可視性不一致は根では閉じていない**。検出側 `cancelledConstructionUnits`(canonical projection)と母集団側 `readPerUnitConsumePopulation`(pool event set + settle 行)の分裂は構造として残る。本 unit が閉じたのは「cancelled という観測を settle 行として母集団側へ渡す」経路のみ。読み口統一(ADR-2 の Alternative B)は別 intent の候補
- **SR2(未対処・スコープ外)**: `loadRuntimeUnitBatches` が `null` を返すと `settlePerUnitOutcomes` は 1 行も発行せず早期 return する(`amadeus-orchestrate.ts:4808`)一方、母集団側は `?? []`(`:2568`)で空 batches として全 unit を pending にする。本変更後もこの非対称は不変
- **SR3(未対処・到達不能)**: batch 未収載 unit の skip(`:4813` の `if (batch === undefined) continue;`)は `computeBatches` が全 unit を分割する契約により well-formed な DAG では到達不能(reviewer-2 実測)。本変更でも構造を保存した
- **failed arm 不在**(上記)。将来 per-unit 経路に「ruling を経ない failed terminal」が生まれた場合は再検討点になる

## 取込時の注意(Bolt 1 との交差)

base(`cd905b05d`)には Bolt 1(PR #3202)が未着地。**設計・コード面の交差は無い** — Bolt 1 の orchestrate 変更は `emitConfiguredSwarm` / `spentPoolRefusal`(swarm emit 境界)で、本 unit の患部(`:2460-2600` の settle 台帳読み口、`:4726-4830` の settle emitter)とは別領域。ただし**台帳ファイルは同一行で衝突する**: 両 unit とも `amadeus/spaces/default/specs/tla/model-map.json` の `amadeus-orchestrate.ts` impl hash pin を更新するため、先行 unit の着地後に rebase したら `bun plugins/formal-model-check/tools/amadeus-sensor-model-completeness.ts updateModelMap --impl-only` を再実行して再 pin すること(マーカー貼り合わせでの解決は不可)。`tests/.coverage-patch-allowlist.json`(Bolt 1 が entry 190 を再アンカー)は本 unit が無変更のため衝突しない。

## 逸脱

なし。ADR-2 実装契約 1〜9 はすべて満たした(契約5 は「到達不能の実証 → 採らない」分岐で充足)。

## 未検証面

- ローカルフルスイート(`bun run test:ci`)と coverage(`coverage:ci` / patch coverage)は**未実行** — remote-first 方針によりリモート CI を正とする(blocking の正本は `ci-success` 集約ジョブ)
- 複数 clone の shard が同一ミリ秒・同一 triple の revision を書く並行系列は未実測(採択規則は key 順の決定的 tie-break へ落ちる設計であることをコードで固定)
- pool 経路で cancelled になった Unit が per-unit stage の settle を通る混在系列(settle 行が pool 優先 de-dup で無視される)は既存テストの green で間接確認したのみで、新規の直接テストは置いていない
