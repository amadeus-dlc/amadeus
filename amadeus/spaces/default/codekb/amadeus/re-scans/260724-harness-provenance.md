# Re-scan 記録 — intent 260724-harness-provenance(Issue #1452)

## 実行メタデータ

- Date(UTC, `date -u` 実測): `Fri Jul 24 11:34:46 UTC 2026`
- Base SHA(`git rev-parse a81c11dde`): `a81c11dde83e0059c48ecc912d2d22dd6bca60eb`
- Observed / HEAD SHA(`git rev-parse HEAD`): `2d0da11d022565bf4a613da9fbcccf078716f8f4`
- Branch: `team/20260724-181510-1d8e/engineer-5`
- 直近 codekb scan: `re-scans/260723-marker-heading-exemption.md`(observed `ffc79aad9`)
- **base 選定(cid:reverse-engineering:rescan-base-ancestry)**: 前回 scan の observed `ffc79aad9a53c600ea9b464f1f04c6fa627ae59e`(260723-marker-heading-exemption)は現 HEAD の**非祖先**(`git merge-base --is-ancestor ffc79aad9 HEAD` → **exit 1**。前 run の engineer-5 ブランチが squash マージで main へ着地したため観測点が HEAD 系統に無い)。記録済み observed のうち祖先である最小距離点を採る: `a81c11dde` は `git merge-base --is-ancestor a81c11dde HEAD` → **exit 0**、`git rev-list --count a81c11dde..HEAD` → **186**(distance)。他の記録済み observed(`78bce8761`・`545e69c83`)も非祖先。よって base=`a81c11dde`(祖先かつ距離最小)。
- Scope: `amadeus-feature`(cid:scope-definition:default-scope-amadeus — 新機能)
- Project type: Brownfield / Repository: `amadeus`
- Stage: `reverse-engineering`(2.1)。Developer スキャン → Architect 合成の直列(cid:reverse-engineering:c3)
- 測定 ref: 全 file:line は Observed=HEAD `2d0da11d` のワークツリー実ファイル直読(Developer scan + Architect 再検証、cid:measurement-ref-in-artifacts)。件数はすべてコマンド出力からの転記(cid:numbers-from-command-output-only)
- 手法: 既存 codekb からの差分リフレッシュ(cid:reverse-engineering:c1)+ 機能 seam 焦点スキャン

### diff 規模(base a81c11dde..HEAD)

- `git diff --shortstat a81c11dde..HEAD` 転記: **1798 files changed, 223029 insertions(+), 3536 deletions(-)**
- 非 record 差分(`git diff --shortstat ... -- . ':(exclude)amadeus/spaces/*/intents/*'`): **1202 files, 109631 insertions(+), 3508 deletions(-)**
- 区間は前回 observed が非祖先(squash マージ)であるため大きい。焦点面 `amadeus-lib.ts`(+1082/−69)・`amadeus-utility.ts`(+608/−112)は区間内で変化しているため、**「バグ面不変」の主張はしない** — 全 file:line 参照は Observed=HEAD `2d0da11d` の実ファイル直読を根拠とする。

## 現行結論(#1452 実装 seam)

Issue #1452 は「どの AI ハーネス(Claude Code / Kiro / Codex / opencode / Cursor)が intent を実行したか」を `amadeus-state.md` と stage `memory.md` に記録する機能。以下は provenance フィールドを載せるための書込経路・検出機構・再利用 seam・センサーリスクの実測合成。

### 1. `amadeus-state.md` の書込経路 — birth-time 単一書込

`## Project Information` ブロックは intent birth 時に1度だけ生成され、ステージ完了時の再生成経路は無い。

```
amadeus-utility.ts:4092:  const stateContent = `# AI-DLC State Tracking
amadeus-utility.ts:4094:## Project Information
amadeus-utility.ts:4095-4103:  Project / Project Type / Scope / Start Date / State Version / Active Agent / Worktree Path / Bolt Refs / Practices Affirmed Timestamp
```

- 組み立て: `handleIntentBirthStateBuild()`(`amadeus-utility.ts:3926`)。書込: `writeStateFile(projectDir, stateContent)`(`:4146`)。
- **含意**: birth 時に埋めるだけなら `:4094-4103` テンプレートへの1行追加。既存 intent(birth 済み)への後付けは birth 経路を通らないため §4 の `setOrInsertField` で別途注入。

### 2. state フィールド検証 — exactly-once(V7 集合)

```
amadeus-migrate.ts:86:   const STATE_V7_FIELDS = [ ... ]   // Project, Project Type, Scope, ... の V7 既知集合
amadeus-migrate.ts:934-942:  function validateStateFields — for STATE_V7_FIELDS: stateFieldCount(state, field) !== 1 を error
```

- 各既知フィールドが **exactly-once** で現れるかを検査する(単なる allowlist-present ではない)。`Harness` は V7 集合外のため**未検査(追加を拒否しない)**。
- **含意**: birth-only 追加なら V7 集合に触れず低リスク。exactly-once 強制を望むなら `STATE_V7_FIELDS` へ追加するが、その場合は既存 state(欠落)が exactly-once で FAIL するため migration による欠落補填 + State Version 整合が別途必要。

### 3. stage `memory.md` の書込経路 — テンプレートのバイトコピー

```
amadeus-lib.ts:1252-1266:  ensureStageDiary()
amadeus-lib.ts:1258:  const template = join(projectDir, harnessDir(), "knowledge", "amadeus-shared", "memory-template.md");
amadeus-lib.ts:1264:  writeFileSync(abs, readFileSync(template));   // バイトコピー
```

- テンプレート実体 `packages/framework/core/knowledge/amadeus-shared/memory-template.md`: H2 見出し4つ(`## Interpretations` / `## Deviations` / `## Tradeoffs` / `## Open questions`)、YAML フロントマターなし。先頭コメント verbatim: `Do NOT un-comment or split across lines. t100 guards this.`
- **参照元がハーネス検出そのもの**: `:1258` は `harnessDir()`(§4)経由 — memory-diary 書込経路に検出機構が内在。配布コピー **10件**(`find -name memory-template.md -not -path './packages/*'` 実測)。
- **高リスク面**: `tests/unit/t100-memory-template-lifecycle.test.ts` が「exactly four headings」「fresh template で `total===0`(`MEMORY_EMPTY` 不変条件、`:55`)」を固定。新規 H2 追加 / YAML 化は t100 を破壊する。provenance を memory.md へ載せるなら**テンプレート改変ではなくコピー後のフィールド注入**(見出し数・total 不変の形)が堅牢。

### 4. ハーネス検出機構 — 天然の provenance ソース(5 種別に 1:1)

```
amadeus-lib.ts:153-157:  // KNOWN_HARNESS_DIRS is NOT the source of truth for which harnesses exist — ...
amadeus-lib.ts:158:  const KNOWN_HARNESS_DIRS = [".claude", ".kiro", ".codex", ".opencode", ".cursor"] as const;
amadeus-lib.ts:168-183:  function deriveHarnessDir()
amadeus-lib.ts:187-193:  export function harnessDir()  //  :190  AMADEUS_HARNESS_DIR env を最優先
```

- 解決順序: `AMADEUS_HARNESS_DIR` env(`:190`)→ スクリプトパス祖父ディレクトリ名 → CWD 上の `KNOWN_HARNESS_DIRS` プローブ(`:179`)→ `.claude` フォールバック。
- `KNOWN_HARNESS_DIRS` の5要素は #1452 対象の**5ハーネス種別と 1:1 対応**。ただし `:153-157` の verbatim「NOT the source of truth」注記があるため、provenance の正準判定に使う場合はこの但し書きと整合させる設計判断が要る。
- 命名規約: `AMADEUS_*` プレフィクスが確立済み(`AMADEUS_HARNESS_DIR`)。

### 5. 再利用可能ヘルパーと先例パターン

```
amadeus-lib.ts:4808:  getField
amadeus-lib.ts:4842:  setField
amadeus-lib.ts:4868:  fieldExists
amadeus-lib.ts:4876:  setFieldStrict
amadeus-lib.ts:4891-4905:  setOrInsertField(content, heading, field, value)   // 実行時追加フィールド向け
amadeus-lib.ts:4828:  export const AUTONOMY_MODE_FIELD = "Construction Autonomy Mode";
amadeus-lib.ts:4830-4832:  export function isAutonomousMode(stateContent)
```

- **後付け向けの最適 seam**: `setOrInsertField`(`:4891-4905`)は「現行 state-template に無いが実行時に追加されるフィールド」向け設計 — 既存 intent への provenance 後付けに最適。
- **先例パターン**: `AUTONOMY_MODE_FIELD` 定数(`:4828`)+ `isAutonomousMode()` 述語(`:4830-4832`)の「定数 + 述語 + 実行時挿入」様式。provenance も `HARNESS_FIELD` 定数 + 検出述語 + `setOrInsertField` 挿入で同型に組める(定数は canonical 1定義から導出 — cid:code-generation:c1 の2定義ドリフト回避)。

### 6. センサーリスク — bun 書込は非発火

```
amadeus-sensor-fire.ts:72-75:  // PostToolUse for Write/Edit always carries `tool_input.file_path` ...
amadeus-sensor-fire.ts:76:  const filePath: string = parsed?.tool_input?.file_path ?? "";
```

- 正本 `packages/framework/core/hooks/amadeus-sensor-fire.ts`(**hooks/**、tools/ ではない)。センサー発火は PostToolUse の `tool_input.file_path` = **Claude の Edit/Write tool 経由の書込のみ**を対象。bun ツール(`writeStateFile` / `writeFileSync`)経由の書込には**発火しない**。
- `amadeus-answer-evidence.md` は state.md / memory.md を対象外。`amadeus-required-sections.md` / `amadeus-upstream-coverage.md` の matches glob には両ファイルが理論上含まれるが、bun 書込では非発火のため実害なし。
- 帰結: **state.md フィールド追加(H2 見出し数不変)はセンサーノーリスク**。**memory.md 構造変更(新規 H2 / YAML 化)は t100 を破壊する高リスク**(§3)。

## 修正候補が触る seam 目録

| seam | 所在 | 件数/注記 |
|---|---|---|
| state テンプレート正本 | `packages/framework/core/tools/amadeus-utility.ts:4094-4103`(`stateContent` の `## Project Information`) | 1(birth-time フィールド追加) |
| state 書込関数 | `amadeus-utility.ts:4146` `writeStateFile(projectDir, stateContent)` | birth 単一書込点 |
| state 検証 | `amadeus-migrate.ts:934-942` `validateStateFields` / `STATE_V7_FIELDS`(`:86`) | exactly-once。`Harness` は V7 外=未検査。集合追加時は migration + State Version 整合 |
| 後付け注入ヘルパー | `amadeus-lib.ts:4891-4905` `setOrInsertField` | 既存 intent への provenance 後付け seam |
| memory テンプレート正本 | `packages/framework/core/knowledge/amadeus-shared/memory-template.md` | H2 4見出し。改変は t100 破壊 |
| memory 生成関数 | `amadeus-lib.ts:1252-1266` `ensureStageDiary`(`:1264` バイトコピー、`:1258` `harnessDir()` 参照) | コピー後注入が堅牢 |
| memory テンプレート配布物 | dist + self-install | **10 コピー**(`find` 実測)。正本編集時 `bun scripts/package.ts` + `bun run promote:self`、`dist:check`/`promote:self:check` がドリフトガード(project.md Mandated) |
| ハーネス検出機構 | `amadeus-lib.ts:168-193`(`deriveHarnessDir` / `harnessDir`)、`KNOWN_HARNESS_DIRS`(`:158`、5要素) | 天然 provenance ソース。`:153-157`「NOT source of truth」注記と整合させる |
| 先例パターン | `amadeus-lib.ts:4828`(`AUTONOMY_MODE_FIELD`)+ `:4830-4832`(`isAutonomousMode`) | 定数 + 述語 + 挿入の既習様式 |
| センサー hook | `packages/framework/core/hooks/amadeus-sensor-fire.ts:72-76` | bun 書込に非発火。state 追加ノーリスク |
| corpus(後付け migration 対象) | `amadeus-state.md` **64件** / stage `memory.md` **584件**(`find` 実測) | 後付けを設計する場合の sweep 対象(cid:corpus-sweep-for-new-guards) |

## Requirements への未決の設計判断(Architect からの引き継ぎ)

1. **provenance の記録先**: (a) state.md のみ / (b) memory.md のみ / (c) 両方。Issue #1452 は両方を示唆するが、memory.md は t100 制約で高リスク(§3)。
2. **memory.md への載せ方**: テンプレート改変(t100 破壊、要テスト改訂)か、`ensureStageDiary` のコピー後にフィールド注入(見出し数・total 不変)か。後者が構造的に堅牢。
3. **検出述語の正準化**: `KNOWN_HARNESS_DIRS`(`:158`)を provenance 判定に使うか、`:153-157` 注記に従い別の source of truth を立てるか。定数は canonical 1定義から導出(cid:code-generation:c1)。
4. **既存 intent への後付けスコープ**: birth 済み intent(state 64 / memory 584)へ遡及するか、新規 intent からのみ記録するか。遡及するなら `setOrInsertField` + corpus sweep + 落ちる実証の面(cid:injection-surface-verify)。
5. **State Version の扱い**: `Harness` を `STATE_V7_FIELDS` へ入れて exactly-once 強制する場合、既存 state の欠落補填 migration と Version 整合が必要(§2)。入れないなら birth テンプレート追加のみで低リスク。
6. **テスト seam**: state 追加は bun 書込でセンサー非発火のため in-process seam テスト(field 挿入・検証)を integration 層に置く(cid:fs-tests-integration-first)。memory.md を触る場合は t100 の期待更新を同一 PR で。

## Delivery boundary

実装・修正コード、`bun scripts/package.ts` / `bun run promote:self` による dist・self-install 再生成、main merge/rebase、Issue close、PR 作成・更新は本 scan で未実施。区間フォーカス正本の変更0件のため配布物は base と同一。
