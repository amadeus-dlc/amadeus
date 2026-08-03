# Code Generation Plan — nfr-kind-pruning

## Scope and Traceability

このUnitはUser StoriesとUnits GenerationをSKIPする `self-fix` であるため、承認済み `inception/requirements-analysis/requirements.md` のFR-1〜FR-9、NFR-1〜NFR-4を直接の正本として実装する。Issue #2019の範囲を超える `tech-stack-decisions` optional化、scope-grid不整合、functional-design map変更、Unit kind語彙追加は行わない。

| Plan step | Requirements |
|---|---|
| Step 1 | FR-1〜FR-6、NFR-2、NFR-4 |
| Step 2 | FR-1、FR-2、FR-7 |
| Step 3 | FR-3、NFR-2、NFR-3 |
| Step 4 | FR-4〜FR-6、NFR-1〜NFR-3 |
| Step 5 | FR-7 |
| Step 6 | FR-8 |
| Step 7 | FR-9、NFR-4 |

## Implementation Steps

### Step 1: 回帰テストを先に追加する

- [x] `tests/unit/t133-bolt-dag-compile.test.ts` にkind欠落fixtureを追加し、現行sensorで失敗を再現する。
- [x] 同テストで5正準kindの成功、不正kindの`malformed`、runtime graphへのkind保持を検証する。
- [x] `tests/unit/t248-stage-contract.test.ts` または既存の最小適合箇所で、5kindすべてのNFR Requirements／NFR Design成果物matrixを固定する。
- [x] `tests/integration/t248-stage-contract-routing.test.ts` に、5kindのconsume投影、library coverage、service全入力、valid+kindless混在のUnit単位fallback、不正1件・runtime graph欠落の全Unit fallbackを追加する。
- [x] 3つのstage正本に対するsource contract assertionを既存の関連testへ追加する。
- [x] packaged Codex harnessを一時プロジェクトへ配置し、library UnitがNFR RequirementsからNFR Designまでpruned matrixで進むE2Eを追加する。
- [x] 既存Bun test runnerとpackage scriptsを再利用し、新しいtest framework・test configurationは追加しないことを確認する。

### Step 2: Units Generation producer契約を完成させる

- [x] `packages/framework/core/amadeus-common/stages/inception/units-generation.md` のplan approvalへ各Unitのkind確認を追加する。
- [x] Unit定義へ5kindの意味と、新規producerでは省略不可であることを追加する。
- [x] YAML例をupstream様式の `name` → `kind` → `depends_on` 順へ更新する。
- [x] completion要約とsensor説明へkind必須契約を追加する。

### Step 3: required-sections sensorでkind欠落をfail-closedにする

- [x] `packages/framework/core/tools/amadeus-sensor-required-sections.ts` の `unit-of-work-dependency.md` 分岐で、parse済み全Unitのkind実在を検査する。
- [x] kind欠落時はexit 0 JSONの `pass: false`、`findings_count >= 1`、欠落Unit名配列を返す。
- [x] 不正kindは共有parserの既存 `edge_block: malformed` を維持し、kind語彙を重複定義しない。
- [x] `packages/framework/core/sensors/amadeus-required-sections.md` にobservable契約を同期する。

### Step 4: producer applicabilityをconsume側へ投影する

- [x] `packages/framework/core/tools/amadeus-orchestrate.ts` のconsume解決へUnit kindを渡す。
- [x] 各consumeのproducerを解決し、producerの既存 `produces_kinds` と `requiredArtifactsForUnit` 相当の正準判定から非適用入力を除外する。
- [x] `consumes_kinds` やlibrary専用特例を追加しない。
- [x] kind付きUnit、kind省略Unit、malformed集合、runtime graph欠落の既存fallback粒度を維持する。
- [x] 5kindのNFR Design入力集合がrequirements.mdの表と一致することをintegration testで確認する。

### Step 5: NFR成果物の転記抑制契約を追加する

- [x] `packages/framework/core/amadeus-common/stages/construction/nfr-requirements.md` にdirective指定outputsのみ生成する指示を追加する。
- [x] `packages/framework/core/amadeus-common/stages/construction/nfr-design.md` にpresent consumesとdirective指定outputsのみ扱う指示を追加する。
- [x] 両stageへ、既決内容は `file:line` 参照、適用外は1行、pruned placeholderは生成しない契約を追加する。

### Step 6: stale project normを訂正する

- [x] `amadeus/spaces/default/memory/project.md` の `cid:nfr-design:c1-engine-produces-all-five` だけを、既知kindではprune、kindlessでは全5成果物という条件付き表現へ訂正する。
- [x] 同じcid周辺以外の既存rulesを変更しない。

### Step 7: 正本・生成物同期と検証を完了する

- [x] focused testsを実行し、Step 1の赤が実装後に緑になることを確認する。
- [x] `bun run lint` と `bun run typecheck` を実行する。
- [x] `bun scripts/package.ts` で生成物を更新し、生成結果だけを変更対象へ含める。
- [x] `bun scripts/package.ts --check` と `bun run promote:self:check` を実行する。
- [x] `git diff --check` と変更パス棚卸しでunrelated plugin変更を混入・上書きしていないことを確認する。
- [x] full `bun run test:ci` を実行する。共有CPU競合で既知のheavy integration 1ファイルだけがtimeoutしたため、該当ファイルを単独・120秒timeoutで再実行して57/57 greenを確認する。

## Expected Files

手書き正本:

- `packages/framework/core/amadeus-common/stages/inception/units-generation.md`
- `packages/framework/core/amadeus-common/stages/construction/nfr-requirements.md`
- `packages/framework/core/amadeus-common/stages/construction/nfr-design.md`
- `packages/framework/core/tools/amadeus-sensor-required-sections.ts`
- `packages/framework/core/sensors/amadeus-required-sections.md`
- `packages/framework/core/tools/amadeus-orchestrate.ts`
- `tests/unit/t133-bolt-dag-compile.test.ts`
- `tests/unit/t248-stage-contract.test.ts`
- `tests/integration/t248-stage-contract-routing.test.ts`
- `amadeus/spaces/default/memory/project.md`

生成物は `bun scripts/package.ts` の結果に従う。`dist/` とpromoted harness資産を直接編集しない。

## Verification Exit Criteria

- [x] 新規Unit成果物のkind欠落をsensorが捕捉する。
- [x] 5kindすべてのNFR output/input matrixが自動テストと一致する。
- [x] library UnitがNFR Requirements 2件、NFR Design 2件でcoveredになる。
- [x] service Unitの5成果物・5 NFR入力契約が維持される。
- [x] kindless legacy recordとmalformed集合のfull-matrix fallbackが維持される。
- [x] focused tests、lint、typecheck、package check、promote check、diff checkが成功する。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-03T01:07:58Z
- **Iteration:** 1
- **Scope decision:** none

実装範囲、5種kindのルーティング、legacy fallback、配布物同期は要件へ概ね追跡できる。しかし、承認済み要件とCode GenerationのComprehensive Test Strategyが要求する検証を完了しておらず、ゲート通過には不足がある。

### Findings

- BLOCKER | NFR-4は実装後の全CI suite実行を明示しているが、planとcode-summaryは `bun run test:ci` をBuild and Testへ延期している。Code Generation内で全CI suiteを実行して結果を記録するか、要件を正式に変更してから再レビューすること。
- BLOCKER | stage契約のComprehensive Test Strategyはunit・integration・E2Eを要求する一方、planとsummaryにはunit／integration／source-contract testsしかなく、E2Eの計画・実行証拠がない。対象ワークフローを通すE2Eテストを追加して結果を記録すること。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-03T01:47:14Z
- **Iteration:** 2
- **Scope decision:** none

反復1の両ブロッカーは解消された。全CI suiteは既知の共有CPU timeout 1件を除き成功し、該当suiteも規定の延長timeoutによる単独再実行で57/57 greenを確認している。Comprehensive戦略に対応するpackaged Codex harness E2Eも追加・実行され、library Unitのpruned成果物、consume投影、artifact guard通過を実証した。計画と実装結果はFR-1〜FR-9およびNFR-1〜NFR-4へ追跡可能で、producer applicabilityの単一正本、legacy fail-safe、生成物同期、scope外事項の保全も一貫している。

### Findings

- None
