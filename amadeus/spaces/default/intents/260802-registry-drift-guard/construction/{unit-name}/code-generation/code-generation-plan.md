# Code Generation Plan — registry-drift-guard

## トレース起点と実装境界

User Storiesは`self-fix`のscope gridによりSKIPされている。このため、全Stepは次のcaptured intentを代替traceとする。

- **CI-PROJECT（amadeus-stateのProject）:** GitHub Issue https://github.com/amadeus-dlc/amadeus/issues/2037 の文書バックフィルとは分離し、CLI dispatch と Valid verb 一覧、および stage schema 受理フィールドと Field reference の不一致を機械検出する registry drift guard を先行実装して再発防止する。
- **具体化入力:** `inception/requirements-analysis/requirements.md`のFR-1〜FR-6／NFR-1〜NFR-6、CodeKBの`architecture.md`、`code-structure.md`、`re-scans/260802-registry-drift-guard.md`。
- **実行正本:** CLIは`packages/framework/core/tools/amadeus-state.ts`のdispatch switch、stage fieldは`packages/framework/core/tools/amadeus-stage-schema.ts`の既存required／optional配列。診断一覧、emitter、仕様、英日referenceは検査対象の投影とする。
- **変更境界:** 正本、focused tests、必要最小限の仕様／reference、CI change detector、既存generatorによる配布面だけを扱う。開始前から存在したplugin overlayと`.codex/tools/data/stage-graph.json`は変更しない。

## 実装ステップ

### Step 1 — baseline、採番、保護対象を固定する

- [x] **対象:** `tests/`、指定回帰5ファイル、`git status --short`、保護plugin資産と`.codex/tools/data/stage-graph.json`。
- **依存:** なし。以後の全Stepより先に実行する。
- **作業:** 固定HEAD／merge-baseを記録し、`t416`が未使用であること、指定5ファイルが174 pass／0 failであること、開始前dirty pathと保護対象hashを確認する。採番衝突時はtest名と全参照を同時改番する。
- **検証:** `bun test tests/unit/t209-stop-hook-state-verb-carveout.test.ts tests/unit/t248-stage-contract.test.ts tests/unit/t62.test.ts tests/unit/t250-unit-iteration-and-scope-preview.test.ts tests/unit/t258-lifecycle-transaction.test.ts`。
- **Captured intent trace:** CI-PROJECT（再発防止guard導入前の再現可能な基準点、intent-only）。Requirements NFR-6／Constraintsで具体化。

### Step 2 — Comprehensive test構成を固定する

- [x] **対象configuration:** `package.json`のBun scripts、`tsconfig.json`、`tsconfig.tests.json`、`biome.json`。新規test runner／config／dependencyは作らない。
- **依存:** Step 1。
- **Unit:** `tests/unit/t416-registry-drift-guard.test.ts`でpure extractor／comparatorの正常系と5種tamperを検証する。
- **Integration:** `tests/integration/t416-registry-drift-guard.integration.test.ts`でlive repository filesと実shell change detectorを検証し、`tests/integration/t65.test.ts`で既存stage inventoryを回帰する。
- **E2E:** N/A。Requirements NFR-6／Constraintsで、新しいservice、database、network I/O、runtime境界、外部journeyを追加しないことが承認済みである。代替の最外検証として、live filesystemから正本／docsを読むintegrationと、NUL区切り入力を実`bash scripts/detect-ci-changes.sh`へ渡すshell integrationを使う。
- **Captured intent trace:** CI-PROJECT（CLI／stage fieldの両registryをComprehensive戦略で固定、intent-only）。Requirements FR-4／NFR-1／NFR-4／NFR-6で具体化。

### Step 3 — known driftをredで固定する

- [x] **対象test files:** `tests/unit/t416-registry-drift-guard.test.ts`、`tests/integration/t416-registry-drift-guard.integration.test.ts`。
- **依存:** Step 2。production変更より先に追加する。
- **Unit cases:** happy path、dispatch-only、phantom `Valid:`、docs omission、empty extraction、duplicate。missing／unexpected／duplicate／empty extraction／cardinality mismatchの代表診断をassertする。
- **Integration cases:** live CLI 33件一致、schema／emitter／authoritative spec／英日reference 25件一致、`when` supported parity、英日docs-only CI route。
- **red検証:** `bun test tests/integration/t416-registry-drift-guard.integration.test.ts`で、修正前の`Valid:`が30件しかなく`Expected length: 33 / Received length: 30`となることを確認する。
- **Captured intent trace:** CI-PROJECT（既知のCLI／stage registry driftを機械的失敗へ変換、intent-only）。Requirements FR-1／FR-2／FR-4、CodeKB re-scanで具体化。

### Step 4 — canonical stage field exportとpure guardを実装する

- [x] **対象application files:** `packages/framework/core/tools/amadeus-stage-schema.ts`、新規`packages/framework/core/tools/amadeus-registry-drift.ts`。
- **依存:** Step 3のred。
- **作業:** 既存`REQUIRED_FIELDS`＋`OPTIONAL_FIELDS`からreadonly `ACCEPTED_STAGE_FIELDS`を導出する。CLI switch、`Unknown subcommand ... Valid:`、emitter `FIELD_ORDER`、version付きMarkdown markerを決定的に抽出するpure helperと、双方向集合差・重複・空抽出・raw cardinalityを返すpure comparatorを実装する。25件の別production定数は作らない。
- **検証:** `bun test tests/unit/t416-registry-drift-guard.test.ts`。
- **Captured intent trace:** CI-PROJECT（stage schema受理fieldとField referenceの不一致再発防止、intent-only）。Requirements FR-2／FR-4、NFR-2〜NFR-4で具体化。

### Step 5 — CLI診断投影をdispatch正本へ同期する

- [x] **対象application file:** `packages/framework/core/tools/amadeus-state.ts`。
- **依存:** Step 4のCLI extractor／comparator。
- **作業:** `Valid:`へ`set-construction-iteration`、`archive`、`unarchive`を追加し、既存dispatch 33件と集合一致させる。handler、verb意味論、表示順契約は変更しない。
- **検証:** t416 live CLI case、および`t209`／`t250`／`t258`回帰。
- **Captured intent trace:** CI-PROJECT（CLI dispatchとValid verb一覧の不一致再発防止、intent-only）。Requirements FR-1／NFR-5で具体化。

### Step 6 — authoritative spec、英日reference、reserved inventoryを同期する

- [x] **対象docs／test files:** `packages/framework/core/amadeus-common/protocols/stage-definition.md`、`docs/reference/15-stage-definition.md`、`docs/reference/15-stage-definition.ja.md`、`tests/integration/t65.test.ts`。
- **依存:** Step 4の`ACCEPTED_STAGE_FIELDS`とmarker extractor。
- **作業:** authoritative tableをaccepted 25 fieldsへ同期し、3文書へ同じ`amadeus-stage-field-registry:v1` markerを置く。`when`を`{producer-in-plan: <artifact-slug>}`のsupported fieldとして記述し、reserved表と`t65`のreserved inventoryから除外する。判断を要するnarrative H3の全件追加はしない。
- **検証:** t416 stage parity／`when` case、`bun test tests/integration/t65.test.ts`。
- **Captured intent trace:** CI-PROJECT（schema受理fieldとField referenceの不一致再発防止、intent-only）。Requirements FR-2／FR-3／NFR-5、CodeKBのschema 25対spec欠落9で具体化。

### Step 7 — docs-only変更を既存full CIへ到達させる

- [x] **対象CI／test files:** `scripts/detect-ci-changes.sh`、`tests/integration/t416-registry-drift-guard.integration.test.ts`。
- **依存:** Step 3のCI route case、Step 6の英日reference paths。
- **作業:** `docs/reference/15-stage-definition.md`と`.ja.md`を`full=true`へ分類する。authoritative specは既存`packages/framework/*` routeを再利用し、新規workflowは作らない。
- **検証:** NUL区切りで英日各pathが`full=true`、無関係な`docs/reference/01-architecture.md`が従来どおり`full=false`であることを実shellで確認する。
- **Captured intent trace:** CI-PROJECT（文書投影のdriftをdocs-only PRでも再発防止、intent-only）。Requirements FR-5、CodeKBのdocs-only CI迂回findingで具体化。

### Step 8 — focused testをgreenへ収束させる

- [x] **対象tests:** `tests/unit/t416-registry-drift-guard.test.ts`、`tests/integration/t416-registry-drift-guard.integration.test.ts`、`tests/integration/t65.test.ts`。
- **依存:** Step 4〜Step 7。
- **検証コマンド:** `bun test tests/unit/t416-registry-drift-guard.test.ts tests/integration/t416-registry-drift-guard.integration.test.ts tests/integration/t65.test.ts`。
- **合格条件:** unit 6、live integration 4、t65 22の計32 testsがgreenで、empty／duplicateを含むtamperがvacuous passしない。
- **Captured intent trace:** CI-PROJECT（2 registry対のguardを常設化、intent-only）。Requirements Acceptance 1〜5で具体化。

### Step 9 — coverage registry、7 dist、self faceを生成する

- [ ] **対象generated files:** `tests/.coverage-registry.json`／`.coverage-ratchet.json`（再生成後byte差なし）、`dist/{claude,codex,cursor,kimi,kiro,kiro-ide,opencode}`の4投影、存在する5 self-install harnessの4投影。
- **依存:** Step 8 green。
- **作業:** 新規testsへ`covers:` headerを付け、`bun tests/gen-coverage-registry.ts`、`bun scripts/package.ts`を正規generatorとして実行する。promoted faceは手編集しない。plugin overlayとstage graphはhash照合して保全する。
- **検証:** coverage `--check`、`bun scripts/package.ts --check`、通常の`bun run promote:self:check`。
- **未完理由:** coverageと7 distはgreenで、隔離条件ではcore self faceのDIFFERS／MISSING 0件を確認した。しかし通常の`bun run promote:self:check`は既存plugin overlayをORPHAN 31件として報告しexit 1のため、Acceptance 7を満たしていない。隔離checkはcore drift不在の補助証拠であり、通常checkの代替ではない。
- **Captured intent trace:** CI-PROJECT（guardを全配布面へ同期、intent-only）。Requirements FR-6／Acceptance 7で具体化。

### Step 10 — Comprehensive品質gateを完了判定する

- [ ] **対象:** focused tests、指定5回帰、t65、typecheck、lint、coverage freshness、package check、通常promotion check、`git diff --check`。
- **依存:** Step 9。
- **検証コマンド:** Step 8のfocused command、Step 1の5-file command、`bun run typecheck`、`bun run lint`、`bun tests/gen-coverage-registry.ts --check`、`bun scripts/package.ts --check`、`bun run promote:self:check`、`git diff --check`。
- **実測:** 8 filesで206 pass／0 fail／383 assertions、typecheck／lint／coverage／package／diffはgreen。通常promotion checkだけがORPHAN 31件でredのため、Acceptance 7と本Stepは未完了とする。
- **Captured intent trace:** CI-PROJECT（registry drift guardの再現可能な完了判定、intent-only）。Requirements NFR-6／Acceptance 1〜7で具体化。

## 非対象

- [Issue #2037](https://github.com/amadeus-dlc/amadeus/issues/2037) の各fieldに対するnarrative説明の全面追加。
- CLI verb順序固定、stage frontmatter新機能、`when`意味論変更、他registryへの横展開。
- plugin overlay、開始前からdirtyなstage graph、無関係なdead codeやformatの整理。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-02T23:11:09Z
- **Iteration:** 1
- **Scope decision:** none

実装結果の主張は要件を概ね覆うが、正式planの実装可能性、Comprehensiveテスト戦略、変更ファイル台帳、promotion品質ゲートの証拠がstage契約を満たしていない。

### Findings

- 正式なcode-generation-plan.mdが完了後の要約投影になっており、詳細計画をレビュー範囲外の別パスへ委譲したうえで、必須のStep 1形式による連番、具体的な対象ファイル、依存順序を欠くため、開発者がこの成果物だけから実装を再現できない。
- ユーザーストーリー不在時は各stepをcaptured intentへ対応付けてintent-onlyであることを記録するstage契約に対し、本planはRequirements／CodeKB由来としFR／NFRだけへ対応付けており、要求された代替トレーサビリティがない。
- Test StrategyがComprehensiveであるにもかかわらず、planには必須の具体的なtest file stepとtest configuration stepがなく、E2Eを承認済み例外や代替証拠なしにN/Aとしているため、stage定義のunit・integration・E2E要件を満たさない。
- code-summary.mdはstage定義が要求する作成・変更ファイル一覧を列挙せず、application code、tests、docs、generated facesという分類と一部の代表パスしか示していないため、変更境界、生成物、要件証拠をファイル単位で照合できない。
- Acceptance 7は通常の`bun run promote:self:check`がgreenであることを要求するが、summaryはplugin overlayを隔離した別条件での成功のみを示し、通常条件では31件のORPHANが残ると明記しているため、受入条件を満たした証拠になっていない。
- t416のlive一致、5種negative tamper、docs-only到達性について、実行コマンド、ケース別結果、失敗診断が示されず、206 passという合算値だけであるため、Acceptance 1〜6とNFR-2のfail-closed診断を再現可能に検証できない。

## Review — Iteration 2

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-02T23:19:31Z
- **Iteration:** 2
- **Scope decision:** none

前回の計画具体性、intent trace、ファイル台帳、再現証拠は改善されたが、Acceptance 7とComprehensive戦略のE2E条件が未達である。

### Findings

- 通常条件の`bun run promote:self:check`が既存plugin ORPHAN 31件によりexit 1であり、plan Step 9／10も未完了のため、NFR-6およびAcceptance 7の必須品質ゲートを満たしていない。隔離条件の成功は正しく補助証拠として扱われているが、完了判定の代替にはならない。
- Test StrategyはComprehensiveでありstage定義はUnit・Integration・E2E test filesを要求するが、plan／summaryはE2EをN/Aとしている。引用されたNFR-6とConstraintsが明示的に免除しているのは性能・セキュリティ検査および新規runtime境界の追加であってE2Eではなく、承認済み例外または同等のE2E検証契約がないため前回指摘は一部未解消である。
