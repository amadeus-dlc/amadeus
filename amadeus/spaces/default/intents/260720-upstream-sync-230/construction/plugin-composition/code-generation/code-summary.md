# plugin-composition コード生成サマリ (U10 / FR-6 item 20)

> 上流入力(consumes 全数): `business-logic-model.md`、`business-rules.md`、`domain-entities.md`(functional-design)、`reliability-design.md`、`logical-components.md`(nfr-design)、`component-methods.md` C4(application-design)、`requirements.md` FR-6 item 20。

## 実装概要

U10 `plugin-composition`(C4)の**機構のみ**を実装した。C5(U09)が投影した plugin bundle を host へ no-clobber で compose し、record-owned な drop、doctor 可視化を三面 atomic に行う正準6公開 seam + 内部 helper を新規モジュール `scripts/plugin-composition.ts` に凝集した。reference plugin `test-pro` の内容・authoring guide(U11)、ledger closure(U12)、実 stage 文書の YAML 逐語編集・実 graph compile 配線は本 Unit の対象外。

配置は U09 先例に整合し `scripts/` 配下(dist へ投影されない開発支援層)とした。正本 `packages/framework/core/` / `harness/` を触らないため、6 harness dist と 4 harness self-install は byte-identical(NFR-3/4、`dist:check` / `promote:self:check` で実証)。

### 公開 seam(`component-methods.md` C4 正準 signature に一致)

- `inspectPlugin(plugin, host): PluginPlanResult` — same-name stage / malformed manifest / unknown seam / clobber を**全数収集**して `rejected`、error 一件で plan/write 0。clean なら `planPluginComposition` へ委譲し `ready`。
- `planPluginComposition(plugin, host): PluginCompositionPlan` — no-clobber stage copy、`produces`/`consumes`/`sensors`/`required_sections` の seam merge(order-preserving union + dedup)、宣言 fragment splice、`PluginRecord` を決定的に構築。
- `applyPluginPlan(plan, tx): ApplyResult` — temp host image で verify(self-heal compile / sensor)後、三面 atomic commit。
- `planPluginDrop(record, host): PluginDropPlan` — record 所有 path のみ removal、shared file は **ledger 累積 rebuild** と current の一致を mutation 前検証し、base + 残存(他 plugin)寄与から決定的再構築。user path は推測削除しない。
- `applyPluginDrop(plan, tx): DropResult` — precondition rejection は commit 前に短絡、それ以外は三面 atomic commit。
- `diagnosePlugins(host, journalPending?): readonly PluginDiagnostic[]` — host snapshot からの read-only 投影(composed / drift / recovery-pending)。副作用なし。
- `discoverPlugins(sourceRoot, io): readonly PluginDescriptor[]` — C4 内部 helper(E-OC1 裁定 A)。projected bundle を canonical sort で列挙し manifest を strict parse。

### 三面 atomicity(E-USSU10FD2 / `functional-design:audit-batch-before-state-atomicity` 準拠)

`WorkspaceBackend` が host / composition-record / audit の三面 + durable journal を保持。committer(`commitTransaction`)は「PREPARED を最初の canonical mutation 前に durable 化 → host→record→audit を適用 → COMMITTED → clear」の順で進める。全 write-set/preimage を事前捕捉(`capturePreimages`)し、handled failure(`Error`)は return 前に全 preimage を即時・冪等復元、crash(`CrashSignal` 伝播)は journal を PREPARED のまま残し**次操作の lock 取得直後の `runRecovery` で pre-state へ冪等回復**。COMMITTED 後の crash は settled(post-state 維持)。journal/preimage drift(current が preimage でも post-image でもない)・corruption(phase 不正等)は追加 mutation 0 で loud 停止し、未回復中は新規 compose/drop を拒否(`stopped`)。record/audit は once。

### shared ownership(E-USSU10FD1)

`SharedFileLedger`(file → base + 順序付き contribution 列)を composition record surface に持つ。plugin は shared file 全体を所有せず、自身の canonical contribution・適用順・期待 post-state のみ記録。drop 時の drift 判定は単一 plugin の point-in-time snapshot ではなく **ledger 累積 rebuild** に対して行う(後続 plugin の合法的 compose で post-state が前進するため)。

## 変更ファイル一覧(実測、測定 ref = worktree HEAD `946ed0ed1` からの working tree)

| File | 種別 | 行数 |
|---|---|---|
| `scripts/plugin-composition.ts` | 新規(6 公開 seam + 内部 helper、純関数 + 注入 transaction、in-memory/node backend) | 1240 |
| `tests/unit/t252-plugin-composition.test.ts` | 新規(純関数 unit、size: small、in-memory backend) | 488 |
| `tests/integration/t253-plugin-composition-fs.test.ts` | 新規(実 FS node backend、size: medium) | 201 |
| `amadeus/spaces/.../construction/plugin-composition/code-generation/code-generation-plan.md` | 新規(本工程 plan) | — |
| `amadeus/spaces/.../construction/plugin-composition/code-generation/code-summary.md` | 新規(本ファイル) | — |

正本 `packages/framework/core/` / `harness/`、`dist/`、self-install ツリーは**未変更**(`scripts/` は投影対象外のため regen 不要 — `dist:check` / `promote:self:check` green で確認)。`bun scripts/package.ts` / `bun run promote:self` は正本非変更のため未実行。

## 検証コマンドと実測 exit code

| コマンド | exit code |
|---|---|
| `bun test tests/unit/t252-plugin-composition.test.ts`(25 tests, 90 expect) | 0 |
| `bun test tests/integration/t253-plugin-composition-fs.test.ts`(5 tests, 37 expect) | 0 |
| `bun test … t252 t253`(Ran 30 tests across **2 files**、path 実在機械確認済み) | 0 |
| `bun run typecheck` | 0 |
| `bun run lint:check` | 0 |
| `bun run dist:check` | 0 |
| `bun run promote:self:check` | 0 |
| `bun tests/complexity-gate.ts --check`(全新規関数 CCN ≤ 15) | 0 |
| `bun tests/gen-coverage-registry.ts --check`(fresh, guards green, ratchet held) | 0 |
| local lcov(`scripts/plugin-composition.ts`: LF=680 / LH=680、**DA:0 = 0 行**) | — |
| `bash tests/run-tests.sh --ci`（RESULT: PASS、TOTAL 77/405/3。wall-clock drift 1 件は既存 `t-codex-hooks-migration`（本 Unit 非関連・advisory 非 gate）） | 0 |

patch 追加行は全て t252 の in-process seam で駆動され spawn 盲点(bun --coverage)を回避(local lcov 680/680)。

## 落ちる実証(新設ガード)

三面 atomicity + recovery ガードの実効性を、fix コミット `2c81d2ccca8bea855858535958106e2f17cdd9fe` の後に `restorePreimages` を no-op(`if (pre) return;`)へ改変して実証した:

- RED: `bun test tests/unit/t252-plugin-composition.test.ts` → `23 pass / 2 fail`。赤化したのは正確に「handled failure after host write restores every preimage before return」「crash leaves the journal PREPARED; the next operation recovers pre-state」の2件のみ(復元機構に依存するテストだけが落ちることを確認)。
- 復元 ref: `git checkout 2c81d2ccca8bea855858535958106e2f17cdd9fe -- scripts/plugin-composition.ts`。
- GREEN: 再実行で `25 pass / 0 fail`。注入は fix コミット後・復元 ref 明示(`falling-proof-no-stash` / E-GMECG 準拠)、working tree は commit と一致(diff 空)。

## 既知の制約(機構境界)

- seam merge の対象は string-entry list として決定的にモデル化(consumes entry = artifact slug)。実 stage frontmatter の YAML 逐語編集は U11 以降。`serializeStageSeams` は本機構の shared-file 正準 byte 形。
- `applyPluginPlan`/`applyPluginDrop` の verify は注入 `verify` 関数(self-heal compile / sensor / doctor の抽象 seam)。実 C1/C2 graph compile・実 sensor 発火の配線は U11 以降。
- `runRecovery` は operation 開始時の lock-time step として呼び出し側(orchestrator/CLI)が駆動する契約。inspect は pure read のため、crash 後の新規操作は recovery を先に走らせてから inspect する(integration t253 で実演)。
- node backend の composition record / audit / journal は temp workspace 直下の dot-file。CLI subcommand への配線(doctor/compose verb)は本 Unit の対象外(機構のみ)。
