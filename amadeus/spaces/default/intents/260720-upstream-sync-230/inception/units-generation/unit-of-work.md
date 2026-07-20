# Unit of Work — upstream-sync-230

> 上流入力(consumes 全数): `components.md`、`component-methods.md`、`services.md`、`component-dependency.md`、`decisions.md`、`requirements.md`。`stories.md` は本 scope で SKIP 済み。

E-USSUG1で採用された12 capability-cohesive Unitsを定義する。全Unitのdeployment modelは既存repository/CLIへの **embedded** で、新規service deployはない。各Unitは実装・配線・targeted tests・該当docsを同乗させ、adapter/外部contractだけを先行着地させない。行数は `decisions.md` のcomponent別見積りを重複なく配賦した手書き変更量で、generated `dist/` は含まない。

## U01: stage-contract

- 責務/要件: C1。Unit kind、`produces_kinds`、stage `number/name/bundle/when/required_sections` の単一schema/normalization（FR-2 item 7、FR-6 item 18）。
- 境界/成果: typed closed vocabulary、graph/directive/sensor共有contract、unknown型のfail-closed。`when`評価は含めない。
- 公開seam: `validateStageFrontmatter`、`normalizeUnitKind`、`requiredArtifactsForUnit`。
- Complexity: L。概算 **605–1,005行**（実装220–380、component tests260–420、ported/trace tests100–160、docs25–45）。
- 制約: shared typeの第二定義を作らず、default fixtureはbyte-identical。

## U02: runtime-recovery

- 責務/要件: C2のrecovery面。bolt DAG自己修復とgate revision backstop（FR-1 items 1–2）。
- 境界/成果: unit正本からのDAG再計算、coverage再計算、idempotent audit/state補完。
- 公開seam: `recoverBoltDag`、`recoverGateRevision`。
- Complexity: M。概算 **395–675行**（実装100–190、component tests180–300、ported tests100–160、docs15–25）。
- 制約: 回復不能を非Unit loopへ黙って降格せず、再実行で二重auditを作らない。

## U03: swarm-and-next-stage

- 責務/要件: C2のbatch/next面。未完了swarm batch選択と実next stage naming（FR-1 item 3、FR-2 item 10）。
- 境界/成果: current runのconvergedだけを使用し、SKIP名をgateへ出さない。
- 公開seam: `selectNextSwarmBatch`、`resolveNextInScopeStage`。
- Complexity: M。概算 **285–485行**（実装60–120、component tests130–220、ported tests80–120、docs15–25）。
- 制約: merge failureをconvergedにせず、FR-0 characterizationで既存同等なら挙動差分を作らない。

## U04: routing-and-autonomy-guards

- 責務/要件: C2の入力/guard面。help routing、compose marker freshness、autonomous Constructionのrecompose guard（FR-1 items 4–6）。
- 境界/成果: 全入口のhelp分類、24h marker、mutation前guard、doctor advisory。
- 公開seam: `classifyHelpIntent`、`inspectComposeMarker`、`assertRecomposeAllowed`。
- Complexity: M。概算 **385–625行**（実装110–190、component tests160–250、ported tests100–160、docs15–25）。
- 制約: stale markerをcarve-outに使わず、拒否時state/plan/graphを不変にする。

## U05: unit-iteration-and-scope-preview

- 責務/要件: C2のnew capability面。unit-major iterationとcompiled-grid由来scope cost preview（FR-2 items 8–9）。
- 境界/成果: opt-in state verb、既定stage-major不変、scope/intention/validate-grid共通summary。
- 公開seam: `nextConstructionStep`、`previewScopeCost`。
- Complexity: L。概算 **450–735行**（実装150–260、component tests180–280、ported tests100–160、docs20–35）。
- 制約: 不正iterationはmutation前reject、未指定の生成bytesは不変。

## U06: workspace-inspection

- 責務/要件: C3。depth-1 nested rootと`.gitmodules`/submodule検出（FR-3 items 11–12）。
- 境界/成果: read-only `WorkspaceScan`、birth/detect/doctor/JSONへの共通投影。
- 公開seam: `inspectWorkspace`、`detectDepthOneProjects`、`inspectSubmodules`。
- Complexity: L。概算 **490–825行**（実装130–240、component tests240–390、ported tests100–160、docs20–35）。
- 制約: top-level signal時は走査せず、複数候補を自動選択せず、submodule初期化を実行しない。

## U07: harness-hook-correctness

- 責務/要件: C6のhook adapter面。`process.execPath`、Kiro IDE context、Claude project-dir quoting（FR-4 items 13–15）。
- 境界/成果: 6 harnessの該当source+projection、PATH除去/空白path/payload absence/failure fixtures。
- 公開seam: `spawnHookWithRuntime`、`parseKiroIdeHookContext`、`renderClaudeHookCommand`。
- Complexity: L。概算 **470–790行**（実装120–220、component tests220–360、ported tests100–160、docs30–50）。
- 制約: harness固有payloadをcoreへ入れず、通常stdoutをdebug logで汚さない。

## U08: reviewer-protocol

- 責務/要件: C6のreviewer面。runtime UTC date、persona/identity、対象Unit+directive.consumesだけのread scope（FR-5 items 16–17）。
- 境界/成果: persona/protocol/template正本と6面投影、scope外path拒否fixture。
- 公開seam: `reviewerReadScope`、`runtimeReviewIdentity`。
- Complexity: M。概算 **260–465行**（実装60–120、component tests110–200、ported tests70–110、docs20–35）。
- 制約: 固定日付、record再帰読取、理由なし追加readを禁止する。

## U09: plugin-projection

- 責務/要件: C5とC1 consumer。`plugins/<name>/` discovery、6 harness projection、`dist/plugins/`、4 self-install境界（FR-6 item 19）。
- 境界/成果: deterministic package tree、byte/orphan/unreferenced drift、plugin 0件baseline。
- 公開seam: `discoverPluginSources`、`buildPluginProjection`、`buildHarnessTree`、`checkHarnessTree`。
- Complexity: XL。概算 **755–1,325行**（実装260–470、component tests350–620、ported tests100–160、docs45–75）。
- 制約: `dist/`手編集禁止、self-installを6面へ拡張しない。

## U10: plugin-composition

- 責務/要件: C4。inspect/plan/no-clobber merge/fragment/compile/doctor/atomic apply/drop（FR-6 item 20）。
- 境界/成果: temp-tree transactionとcomposition record。reference plugin内容・guideはU11に委譲する。
- 公開seam: `inspectPlugin`、`planPluginComposition`、`applyPluginPlan`、`planPluginDrop`、`applyPluginDrop`、`diagnosePlugins`。
- Complexity: XL。概算 **1,070–1,720行**（実装520–850、component tests350–550、ported tests140–220、docs60–100）。
- 制約: conflict/malformed/unknown seam/partial applyはhost bytes・record・audit不変でloud failure。

## U11: reference-plugin-and-guides

- 責務/要件: C4/C7のreference面。`test-pro` plugin、build→compose→doctor→drop fixture、reference/authoring guide（FR-6 items 21–22）。
- 境界/成果: 最小plugin source、6面projection検証、no-clobber/deferred/6対4差の利用者文書。
- 公開seam: `test-pro` manifest/artifactsとend-to-end fixture。新runtime APIは追加しない。
- Complexity: L。概算 **605–990行**（reference source70–130、component tests300–450、ported tests80–140、docs155–270）。
- 制約: marketplace/lockfile/agents/scopes/memory/knowledge/`when`評価を持ち込まない。

## U12: verification-and-ledger-closure

- 責務/要件: C7のclosure面。全24 item evidence、full CI/coverage、最終SHA、ledger `APPLIED` transition（FR-0、FR-8）。
- 境界/成果: 各Unitが残したtest/docs証拠の集約とidempotent final transition。機能実装は持たない。
- 公開seam: `traceCoverage`、`assertPhaseVerification`、`planLedgerTransition`。
- Complexity: S。概算 **70–130行**（closure tests30–40、ledger/trace40–90）。
- 制約: 24 disposition/必須gate/最終SHAのいずれか欠落時は`APPLIED`を拒否する。

## 規模合算と再利用棚卸し

12 Unit合計は **5,840–9,770行**。`decisions.md` の実装1,800–3,170 + tests3,580–5,790 + docs/trace460–810と一致する。

| Unit群 | 既存再利用 |
|---|---|
| U01/U02–U05 | stage-schema、graph、orchestrate、state、swarm、utility、audit lock/emitter |
| U06 | workspace detector、birth/detect/doctor JSON formatter |
| U07/U08 | 6 harness manifests/adapters、11 hook wiring、review personas/protocol |
| U09 | `scripts/package.ts` discover/build/check、`promote-self.ts` 4面closed list |
| U10/U11 | compose/doctor/state primitives、sensor/compiler、temp workspace fixtures |
| U12 | 461 tests、CI scripts、coverage registry、upstream-sync ledger |

新規job/service/runtime dependencyは0。新規のplugin composition機構は既存に同等ownerがないためU10でのみ導入する。
