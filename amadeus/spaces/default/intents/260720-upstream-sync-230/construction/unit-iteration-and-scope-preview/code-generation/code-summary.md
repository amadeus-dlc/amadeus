# Code Summary: unit-iteration-and-scope-preview (U05)

> 上流入力(consumes 全数): `business-logic-model.md`、`business-rules.md`、`domain-entities.md`、`logical-components.md`、`performance-design.md`、`reliability-design.md`、`scalability-design.md`、`security-design.md`、`requirements.md`、`unit-of-work.md`。

## 概要

FR-2 items 8–9(unit-major iteration・scope cost preview)を、FD 既承認の正準 2 pure decision seam として実装し、既存 C2(graph / state / CLI)choke point へ byte-safe に配線した。測定 ref = 作業ツリー(base commit `0abc480ebe56983621b8654fb1b0a69106c43093` との diff)。

## 変更ファイル一覧(正本)

| ファイル | 変更内容 |
|---|---|
| `packages/framework/core/tools/amadeus-graph.ts` | 正準 pure 型 + seam: `ConstructionIteration`/`parseConstructionIteration`/`readConstructionIteration`/`ConstructionStep`/`WorkflowState`/`StageGraph`/`coverageKey`/`nextConstructionStep`/`selectNextUnitForStage`/`ScopeSummary`/`summarizeExecuteStages`/`previewScopeCost`。`validate-grid` COMMAND に additive `summary` 投影。 |
| `packages/framework/core/tools/amadeus-state.ts` | 新 verb `set-construction-iteration`(dispatch case + `handleSetConstructionIteration`、export)。`parseConstructionIteration` で不正値を全 mutation 前に fail-closed reject。 |
| `packages/framework/core/tools/amadeus-orchestrate.ts` | `emitPerUnitRunStage` の unit 選択を `selectNextUnitForStage` へ委譲(`readConstructionIteration` で iteration 読取)。既定 stage-major は byte-identical。 |
| `packages/framework/core/tools/amadeus-utility.ts` | intent birth stdout に additive な `Scope cost: N stages, M approval gates` 行(`previewScopeCost` 由来)。 |

生成物: `dist/{claude,codex,cursor,kiro,kiro-ide,opencode}/**`(`bun scripts/package.ts`)+ self-install 4 面 `.claude`/`.codex`/`.cursor`/`.opencode`/tools(`bun run promote:self`)。手編集なし。

テスト・登録:
- 新規 `tests/unit/t250-unit-iteration-and-scope-preview.test.ts`(pure seam を direct import、in-process)。
- 新規 `tests/integration/t250-unit-iteration-and-scope-preview.test.ts`(shipped tool の subprocess parity + production adapter の in-process drive)。
- `tests/unit/gen-coverage-registry.test.ts`: `EXPECTED_NONE_TO_CLI` に t248/t249/t250 を追記(t248/t249 は base の未登録 drift を同時是正)。
- `tests/.coverage-patch-allowlist.json`: state.ts の spawn-only 3 レンジ(dispatch case + 2 error-exit)を追加。
- `tests/.complexity-baseline.json`: `main`(amadeus-state.ts)を CCN 33→34 に surgical 更新(新 verb dispatch case による +1)。
- `tests/.coverage-registry.json` / `.coverage-ratchet.json`: 再生成。

## 実装契約

```ts
// FR-2 item 8
type ConstructionIteration = "stage-major" | "unit-major";
function parseConstructionIteration(raw: string): { ok: true; value } | { ok: false; error };
function nextConstructionStep(state: WorkflowState, graph: StageGraph): ConstructionStep;
function selectNextUnitForStage(stage, units, isCovered, iteration): string | null;

// FR-2 item 9
interface ScopeSummary { scope: string; stageCount: number; gateCount: number }
function previewScopeCost(scope: string, grid: ScopeGrid): ScopeSummary;
```

- **既定 byte-identity(NFR-3 / BR-U05-02):** iteration 未指定時、`Construction Iteration` field は serialize されず、`nextConstructionStep`/`selectNextUnitForStage` は単一 stage matrix で stage-major と同一の「最初の未 cover unit」を返す。orchestrate byte-identity は t120/t186 で実証(green)。
- **mutation-before-reject(BR-U05-05):** `set-construction-iteration <invalid>` は lock 取得・read・write の前に `error()` で reject。t250 integration が exit≠0 + state byte 不変を実測。
- **preview count parity(BR-U05-07/09):** `previewScopeCost` の stageCount = scope の EXECUTE 数、gateCount = そのうち非 initialization 段(computeGate 規則と一致)。t250 unit が全 scope を compiled grid + graph からの独立再集計と照合。`validate-grid` JSON は既存 `{valid,errors,advisories}` 順不変 + additive `summary`。
- **gate 定義の機構引用:** 非 gated は initialization phase 段のみ(`amadeus-orchestrate.ts` `computeGate`: `if (node.phase === "initialization") return false;`、file 実測)。

## スコープ宣言(reviewer 裁定対象)

FD は 2 関数を pure decision seam とし、mutation を既存 transaction に残すと明記(business-logic-model.md:34,61-63)。要件の実型は未実在のため本 Unit が正準型を新設した。checkbox ベース stage 前進モデルの作り替え(cross-stage unit-major の live 前進)は FD 禁止の giant refactor に当たるため非対象とし、`nextConstructionStep` は per-stage emission の canonical unit 選択として配線した(単一 stage matrix ゆえ既定 byte-identical)。item 9 の production consumer は intent birth(human 表示、`previewScopeCost`)+ validate-grid(JSON additive summary、`summarizeExecuteStages`)。両者は同一 count owner を共有する。

## 検証(同期実行・パイプなし・実測 exit code)

| コマンド | exit |
|---|---|
| `bun run typecheck` | 0 |
| `bun run lint:check` | 0 |
| `bun run dist:check` | 0 |
| `bun run promote:self:check` | 0 |
| `bun tests/complexity-gate.ts --check` | 0 |
| `bun tests/gen-coverage-registry.ts --check` | 0 |
| `bun test tests/unit/t250 ... tests/integration/t250 ...`(t120/t186/t190 併走) | 0（76 pass） |
| `bun test tests/unit/gen-coverage-registry.test.ts` | 0（42 pass） |
| `bun tests/coverage-patch-gate.ts --check`(base=U05 開始 commit) | 0（uncovered 0） |
| `bash tests/run-tests.sh --ci` | 実 test 失敗 0。負荷起因の flake のみ（下記） |

**TDD RED→GREEN:** t250 unit を stale dist に対して実行し `Export named 'parseConstructionIteration' not found`(RED)を実測 → `bun scripts/package.ts` 後 GREEN(18 pass)。

**落ちる実証(bun-inbody-comment-da0 の封じ込め):** graph の in-body 説明コメントが lcov で DA:0 になり patch gate が赤くなることを実測(graph:1495・2106-2111)→ コメントを module-scope doc / trailing 化して除去し GREEN。

**patch coverage:** in-process driver で seam・validate-grid COMMAND・state handler happy path・intent birth(既存 in-process birth test 経由)を lcov 可視化。spawn-only の残余(state.ts の dispatch case + 2 error-exit)のみ allowlist(spawn-blindspot-two-step (ii)、既存 dispatch-case 前例と同型)。base(origin/main)差分での uncovered は全て sibling U01/U06/… の未マージ行であり本 Unit 分は 0。

## 既知の制約 / flake

- `bash tests/run-tests.sh --ci` は full-suite 負荷下で `t-team-up-codex-resume.test.ts`(単独では 54 pass)と `t-codex-hooks-migration.test.ts`(wall-clock drift 34s)が flake する。いずれも codex team-up / hooks 系で本 Unit と無関係。単独実行で green を確認済み。`coverage-project-gate.test.ts` の `900/1000` 出力は同 test の合成 fixture(実 gate ではない)。
- cross-stage unit-major の live 前進は非対象(上記スコープ宣言)。
