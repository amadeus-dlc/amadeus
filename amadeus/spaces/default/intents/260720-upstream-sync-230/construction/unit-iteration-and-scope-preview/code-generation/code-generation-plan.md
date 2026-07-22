# Code Generation Plan: unit-iteration-and-scope-preview (U05)

> 上流入力(consumes 全数): `business-logic-model.md`、`business-rules.md`、`domain-entities.md`、`logical-components.md`、`performance-design.md`、`reliability-design.md`、`scalability-design.md`、`security-design.md`、`requirements.md`、`unit-of-work.md`。

## 目的と承認境界

本 Unit は Requirements Analysis の FR-2 items 8–9、Functional Design の BR-U05-01〜15、NFR Design の pure-decision / mutation-before-reject / additive-summary 契約を、既存 C2(graph / state / CLI)の choke point へ最小実装する。公開 seam は FD 既承認の正準 2 pure 関数に限定する。

```ts
function nextConstructionStep(state: WorkflowState, graph: StageGraph): ConstructionStep;
function previewScopeCost(scope: ScopeName, grid: CompiledGrid): ScopeSummary;
```

- 新しい service、schema、parser DSL、audit event、runtime dependency、policy、threshold、第二 grid parser、巨大 file の一般 refactor は追加しない(FD Integration boundaries、BR-U05-15)。
- `dist/` と self-install tree は生成物であり手編集しない。package は現行 6 harness、self-install は現行 4 面の closed set を維持する。
- 既存の他 Unit 差分は共有 worktree の仕掛かりとして保持し、本 Unit の比較・stage・commit へ混入させない。

## 実装解釈(scope 宣言)

FD は 2 関数を **pure decision seam** とし、mutation は「decision 後の既存 lock/audit transaction」に残すと明記する(business-logic-model.md:34,61-63、domain-entities.md:24,36)。要件 FR-2 の実型(`WorkflowState`/`StageGraph`/`ConstructionStep`/`ScopeName`/`CompiledGrid`/`ScopeSummary`)はコードベースに未実在のため、本 Unit が正準 pure 型と関数を新設する。既存の巨大 file(orchestrate 3356行、utility 5194行)の checkbox ベース stage 前進モデルを作り替えることは FD が禁ずる「giant refactor」に当たるため行わない。したがって本 Unit の production wiring は次の byte-safe な範囲に限定し、reviewer/conductor の裁定対象として明示する:

- `nextConstructionStep`: 正準 pure 決定として実装し、既存 per-unit 選択 choke point(`emitPerUnitRunStage` の unit 選択)へ委譲配線する。iteration 未指定(既定 stage-major)では選択結果・directive・生成 bytes が完全に不変(NFR-3 / BR-U05-02)。
- `parseConstructionIteration` + 新 state verb `set-construction-iteration`: 不正値を state/plan/graph/audit の全 mutation 前に reject(BR-U05-05)。未指定は field を serialize せず既定経路を byte-identical に保つ。
- `previewScopeCost`: 正準 count owner。`validate-grid` の JSON へ additive な `summary` を投影(BR-U05-10)。scope 一覧表示(`renderHelpText`)は同じ canonical core 由来の count を消費して単一導出源を確立(byte-identical、BR-U05-09/11)。

item 9 の 4 consumer(scope confirmation / intent birth / scope-change / validate-grid)の human 表示側 gate 数提示は、同一 `ScopeSummary` 由来として本 Unit の canonical core を単一の count owner に確立したうえで、byte-additive に着地できる validate-grid(JSON)を本 Unit の production consumer とする。他 consumer の可視表示追加は本 Unit の canonical core を消費する presentation layer であり、範囲判断を成果物に明示して付議する。

## トレーサビリティ

| 要求 | 実装対象 | 検証対象 |
|---|---|---|
| FR-2.8 / BR-U05-01〜06 | `ConstructionIteration`/`parseConstructionIteration`/`nextConstructionStep` を `amadeus-graph.ts` の正準 pure 決定とし、`amadeus-orchestrate.ts:emitPerUnitRunStage` が unit 選択で消費、state verb が opt-in 値を検証 | stage-major/unit-major の matrix 順、未指定 byte 不変、不正 iteration の mutation 前 reject、pure(入力非変更) |
| FR-2.9 / BR-U05-07〜11 | `ScopeSummary`/`summarizeExecuteStages`/`previewScopeCost` を `amadeus-graph.ts` の正準 count owner とし、`validate-grid` JSON が additive `summary` を投影、`renderHelpText` が同一 core を消費 | 全 scope の stage/gate count が compiled grid と一致、JSON 既存 field/value/順序不変 + summary additive、consumer 間 count 一致 |
| C2 ownership / BR-U05-12〜15 | 正準 signature 固定、U01 kind・U03 batch・U12 ledger を移さない、mutation は既存 transaction、新 service/DB/network/UI/dep なし | 未承認 signature 拒否、境界 grep、既存 CLI byte 不変 |
| FR-0 / NFR | 既存 Bun/TypeScript/generator/test stack のみ | targeted、typecheck、lint、dist、promote-self、full CI、local lcov exact patch 100% / allowlist 0、sensor、独立 review |

## 変更候補

### Authored source

- `packages/framework/core/tools/amadeus-graph.ts`: 正準 pure 型 + 4 seam(`parseConstructionIteration`、`nextConstructionStep`、`summarizeExecuteStages`、`previewScopeCost`)、`ScopeSummary`/`ConstructionStep`/`ConstructionIteration`/`WorkflowState`/`StageGraph` 型。I/O・audit・mutation は置かない(`previewScopeCost` は既存 `loadGraph()`/`validScopes()` の compiled 参照のみ)。`validate-grid` COMMAND に additive `summary` を投影。`renderScopeCount` 系は既存表示と byte-identical に単一 core へ委譲。
- `packages/framework/core/tools/amadeus-state.ts`: `set-construction-iteration <stage-major|unit-major>` verb。`parseConstructionIteration` で検証し不正は全 mutation 前に fail-closed reject、正当値のみ `Construction Iteration` runtime field を `setOrInsertField` で記録(`set-skeleton-stance` の様式に倣う)。
- `packages/framework/core/tools/amadeus-orchestrate.ts`: `emitPerUnitRunStage` の unit 選択が `nextConstructionStep` を消費。iteration 未指定は選択・directive・gate suppression が既存と完全一致(byte-identical)。

### Tests and generated evidence

- 新規: `tests/unit/t250-unit-iteration-and-scope-preview.test.ts`。4 pure seam の正常・境界・失敗を direct import で固定(stage-major/unit-major matrix、全 uncovered/all-covered、不正 iteration parse、全 scope の preview count vs compiled grid、additive summary)。
- 新規: `tests/integration/t250-unit-iteration-and-scope-preview.test.ts`。実 shipped tool の subprocess で state verb の不正 reject(state/audit bytes 不変)、既定 next の byte 不変、`validate-grid` JSON の additive summary を固定。
- generated: `dist/{claude,codex,cursor,kiro,kiro-ide,opencode}/**` と self-install 4 面は `bun scripts/package.ts` / `bun run promote:self` の出力のみ受理。
- coverage registry の 3 ファイルは新規 test 登録のため再生成する(`bun tests/gen-coverage-registry.ts`)。`package.json`・設定・threshold・allowlist は変更しない。

## 実装計画

1. [ ] baseline と Unit 境界を固定(共有 dirty 列挙、既存 owner 確認)。
2. [ ] 4 pure seam を先に RED(unit t250: matrix 順、不正 parse、preview count、summary)。
3. [ ] production path を RED(integration t250: state verb 不正 reject、既定 next byte 不変、validate-grid additive summary)。
4. [ ] `amadeus-graph.ts` に 4 pure seam + 型を最小実装(I/O なし、fail-fast for programmer error)。
5. [ ] state verb を `parseConstructionIteration` へ接続(全 mutation 前 reject)。
6. [ ] `emitPerUnitRunStage` の unit 選択を `nextConstructionStep` へ委譲(既定 byte-identical)。
7. [ ] `validate-grid` JSON へ additive `summary`、`renderHelpText` を単一 core へ委譲。
8. [ ] targeted RED→GREEN + local lcov exact patch 100% を確定。
9. [ ] `bun scripts/package.ts` + `bun run promote:self` で 6/4 面を正規生成。
10. [ ] 同一最終差分で verification 全数 + sensor + code-summary を閉包し、独立 review と §13 を付議。

## 完了条件

- 4 canonical pure seam が pure で、state verb・orchestrate・validate-grid・help が同じ判定を消費する。
- iteration 未指定の既定経路は directive/state/human/JSON bytes が不変。
- 不正 iteration は全 mutation 前に reject され、state/plan/graph/audit が不変。
- 全 scope で `previewScopeCost` の stage/gate count が compiled grid と一致し、`validate-grid` JSON は既存 field 不変 + additive summary。
- source・generated 6 面・self-install 4 面・targeted/typecheck/lint/dist/promote/full CI/coverage/sensor・独立 review が同一最終差分で green。

## 非対象

- checkbox ベース stage 前進モデルの作り替え、cross-stage unit-major 前進の state モデル改修(giant refactor 禁止)。
- 新 service/DB/network/UI/runtime dependency/schema/parser DSL/audit event/policy/threshold/第二 grid parser。
- U05 外の Unit、別 stage、既存巨大 file の一般 refactor、upstream source の実行。
- `dist/` 手編集、self-install 6 面化、commit 承認前の push/PR/merge。
