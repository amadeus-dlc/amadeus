上流入力(consumes 全数): intent-statement.md、scope-document.md、raid-log.md

# RE スキャン記録 — 260717-mirror-issue-tool(Developer スキャン)

amadeus-mirror ツール(`scripts/amadeus-mirror.ts`、create / sync / close)が依存する seam の現行実装を、diff-refresh で確定した記録。真実源は本ファイルと re-scans エントリ。手法は diff-refresh(cid:reverse-engineering:c1、E-L63 の base 選定則)。実測はすべて読み取りのみ(git 状態変更なし)。

## 実行メタデータと base 選定(rescan-base-ancestry)

- **observed(HEAD)**: `3d89916e6eb70f5d34683f8a7141ce1afe33d4b4`(`git rev-parse HEAD` 実測)
- **base**: `6495e03a12d9e7149c2e80b59f171a90607a2d2c`(re-scans 全 observed のうち HEAD 祖先かつ距離最小)
- **base..HEAD コミット数**: 107(`git rev-list --count 6495e03a..HEAD`)
- **base 選定の実測記録**: re-scans 全20ファイルの `observed` を抽出し、各々 `git merge-base --is-ancestor <sha> HEAD` で祖先性を判定した。squash マージ運用のため最新3件(260716-github-issue-912 の `8e8cc9b1`、260716-teamup の `5761e65c`、260715-opencode-cursor の `6a23b0ec`)はいずれも **NOT-ANCESTOR**(feature ブランチ tip が squash 済み)。祖先の中の距離最小は `6495e03a`(dist=107、260715-parser-checkbox-fixes.md:12 の Observed commit)。次点の祖先 observed は `60f5e1edf`(dist=223)で大きく劣後。よって `6495e03a` を base 採用。`git merge-base --is-ancestor 6495e03a HEAD` → exit 0 実測。
- **祖先性除外の記録**: 非祖先 observed は E-L63(非祖先 observed は base 候補から除外)に従い除外。共有 `reverse-engineering-timestamp.md` の「最新」ポインタは repo-level freshness に限り差分 base の真実源にしない。

## 重点1: `amadeus-runtime.ts summary --json` の出力契約

canonical = `packages/framework/core/tools/amadeus-runtime.ts`(区間内 **無変更** — `git diff 6495e03a..HEAD -- '*amadeus-runtime.ts'` は dist の新ハーネスコピー(cursor/opencode)のみで canonical 不変)。実行検分は配布コピー `bun .claude/tools/amadeus-runtime.ts summary --json` 経由(no-canonical-direct-execution 準拠)。

`RuntimeSummary` 型(`packages/framework/core/tools/amadeus-runtime.ts:916-941` verbatim):

```
interface RuntimeSummary {
  workflow_id: string;
  scope: string;
  started_at: string;
  duration_minutes: number | null;
  stages: { total: number; approved: number; failed: number; pending: number };
  by_phase: Record<
    string,
    { total: number; approved: number; failed: number; pending: number }
  >;
  memory: { total; interpretations; deviations; tradeoffs; open_questions };
  sensors: { total; passed; failed; budget_override; incomplete };
  learnings: { from_orchestrator: number; from_user_addition: number };
}
```

実行実測(本 intent、observed HEAD)のトップキー: `workflow_id, scope, started_at, duration_minutes, stages, by_phase, memory, sensors, learnings`。`stages` と `by_phase.<phase>` は同一の集計形 `{total, approved, failed, pending}`。`by_phase` のキーは出現したフェーズのみ(実測では `initialization/ideation/inception` の3つ)。

**mirror ツール向けの重要点**: `summary --json` は集計カウントのみで、**intent の slug / record パス / ミラー Issue 番号を一切含まない**。状態行(定型3要素の「状態行」)の材料になるのは集計値だが、intent 名・record リンクは intents.json と record ディレクトリ名から別途取得が必要。ソースは `summarize()`(:964)で `runtime-graph.json` を読む(:966-967 `if (!existsSync(path)) return null;`)。runtime-graph は gitignore 対象(per-Bolt)である点に注意。

## 重点2: intents.json の読み書き機構

canonical = `packages/framework/core/tools/amadeus-lib.ts`(getField/registry 系は区間内 **実質無変更** — `git diff 6495e03a..HEAD` の getField ヒットは無関係な呼び出し元追加(`getField(stateContent, "Scope")` 等)のみで、`appendIntentToRegistry`/`updateIntentStatus`/`IntentRegistryEntry` の定義ハンクなし)。

- **エントリ型** `IntentRegistryEntry`(`amadeus-lib.ts:1548-1567`): `{ uuid, slug, dirName?, scope?, repos?, status, docsOnly? }`。`status` は `string` 型(enum ではない)。
- **パス解決** `intentsRegistryPath`(:1581-1583): `join(intentsDir(projectDir, space), "intents.json")`。
- **読み** `readIntentRegistry`(:1615-):`JSON.parse` → 配列でなければ `[]`(absent/malformed 寛容)。
- **追記** `appendIntentToRegistry`(:1585-1601):`writeFileAtomic(path, JSON.stringify(list, null, 2)+"\n")`。
- **status 更新** `updateIntentStatus`(:1930-1954、verbatim 抜粋):

```
export function updateIntentStatus(projectDir, dirName, status, space?): boolean {
  ...
  for (const entry of list) {
    if (!recordDirMatches(entry, dirName)) continue;
    if (entry.status !== status) { entry.status = status; changed = true; }
    break;
  }
  if (changed) { ...writeFileAtomic(...); }
  return changed;
}
```

- **行→dir 結合ルール** `recordDirMatches`(:1574-1579): `entry.dirName` 完全一致優先、無ければ legacy `<slug>-<id8>` 形へフォールバック。全 registry mutator が共有。
- **status 語彙(実 intents.json 実測)**: distinct 値は `complete`(36)/ `in-flight`(2)/ `closed`(1)。本 intent 行は `{"slug":"mirror-issue-tool","dirName":"260717-mirror-issue-tool","scope":"amadeus","status":"in-flight"}`。完了時 `updateIntentStatus(..., "complete")`(下記重点3)。
- **書き込み規律**: すべての mutation は WORKSPACE lock bucket 下で行う契約(:1546 コメント「MUST be called under the WORKSPACE lock」)。mirror ツールは **書かない**(read-only 消費)ため lock 不要だが、書く場合は要ロック。

## 重点3: park 状態の機械可読表現(raid-log R1 の解答)

**R1 確定**: park は **intents.json の status を変えない**(park 後も `in-flight` のまま)。park マーカーの実体は **amadeus-state.md の `## Runtime State` 節の2フィールド**。

`amadeus-state.ts` の `handlePark`(`packages/framework/core/tools/amadeus-state.ts:607-636`、区間内 **無変更** — park/unpark のハンクなし)verbatim 抜粋:

```
emitAudit(pd, "WORKFLOW_PARKED", { Stage: currentSlug, Timestamp: timestamp });
content = setOrInsertField(content, "## Runtime State", "Parked", timestamp);
content = setOrInsertField(content, "## Runtime State", "Parked At Stage", currentSlug);
content = setField(content, "Last Updated", timestamp);
writeStateFile(pd, content);
console.log(JSON.stringify({ parked: true, stage: currentSlug, timestamp }));
```

- **書く先**: `## Runtime State` 節に `- **Parked**: <ISO timestamp>` と `- **Parked At Stage**: <current stage slug>` を挿入。両者は runtime-only フィールド(Skeleton Stance と同類、:593-594 コメント)。
- **監査**: `WORKFLOW_PARKED` イベント(Stage/Timestamp)を audit-first で記録。
- **拒否条件**: `Construction Autonomy Mode: autonomous` 時は park 拒否(:611)、`Status == "Completed"` 時は拒否(:618「nothing to park」)。
- **unpark** `handleUnpark`(:641-657): `removeField("Parked")` / `removeField("Parked At Stage")`、`WORKFLOW_UNPARKED` 監査。冪等。
- **orchestrate 側の観測**: `amadeus-orchestrate.ts:1476-1481` が `getField(stateContent, "Parked At Stage")` を読み、`Parked At Stage == Current Stage` のときのみ terminal `parked` directive を emit(STALE-BY-PROGRESS ガード:1465-1466)。
- **現状の実 state**(本 intent、RE resume 中): `Status: Running`、`Parked` フィールドは **未挿入**(inception 実行のため unpark 済み)。park 状態を判定するには `getField(state, "Parked")` の非空を見る(unpark の `wasParked` 判定と同じ、:645)。

**mirror ツールへの含意**: 「park されているか」の機械判定 = `amadeus-state.md` の `- **Parked**:` フィールドが非空か(getField)。park は intents.json に痕跡を残さないため、**intents.json だけでは park を検知できない**。状態行の材料として park を映すなら state ファイルを読む必要がある。

## 重点4: amadeus-state.md の Current Status 節フィールドとパーサ

実 state ファイル(`amadeus/spaces/.../260717-mirror-issue-tool/amadeus-state.md`)の `## Current Status` 節フィールド(実測 verbatim):

```
## Current Status
- **Lifecycle Phase**: INCEPTION
- **Current Stage**: reverse-engineering
- **Next Stage**: practices-discovery
- **Status**: Running
- **Last Updated**: 2026-07-17T13:23:34Z
```

- **パーサ** `getField`(`amadeus-lib.ts:3588-3599`、verbatim):`- **<Field>**: <value>` 行を正規表現 `^- \*\*<field>\*\*:[ \t]*(.*)$`(`m` フラグ)でマッチ、`trim()` して返す。空値は `""`(次行へ跨がない)。**これが state.md 全フィールド読み取りの唯一の seam**。
- **Status フィールド語彙**: `setField(content, "Status", ...)` の実測値は `"Running"`(:1368)と `"Completed"`(:1518/:1603)。ステージ実行中は他に checkbox 状態(`awaiting-approval`/`revising`)が Stage Progress 側に現れるが、Current Status の `Status` フィールド自体は Running/Completed の2値が主。
- **他の有用フィールド**: `## Project Information` に `Project`(intent 説明)、`Scope`、`Start Date`。`## Phase Progress` に各フェーズの `Pending/Active/Verified/Skipped/Skipped`。

## 重点5: 既存兄弟 CLI(`scripts/`)の様式 — 新 CLI が倣う既習様式

対象兄弟: `scripts/metrics-timeseries.ts`(区間内で新規追加・#921、read-only viewer)、`scripts/metrics-retention.ts`、`scripts/metrics-snapshot.ts`。最も近い雛形は **metrics-timeseries.ts**。

- **shebang なし**: `bun scripts/<name>.ts` 直接実行前提(冒頭は行コメント、shebang 行なし)。
- **エントリ様式**(`scripts/metrics-timeseries.ts:236` verbatim):`if (import.meta.main) process.exit(main(process.argv.slice(2)));`
- **main の型**: `export function main(argv: string[]): number`(:188)— 数値 exit code を返す。成功 `0`、エラー `1`、usage 誤り `2`(:「return 2」+ USAGE 表示)。
- **エラー様式**: `console.error(...)` で loud 出力 → 数値 return。例外は try/catch で Result 化。
- **引数**: `const USAGE = "Usage: bun scripts/metrics-timeseries.ts [--collector <id>] [--last <n>]"`(:164)、`export function parseArgs(argv): ArgsOutcome`(:171)で判別ユニオン Result を返す(parse-don't-validate)。
- **型様式**: 判別ユニオン(`{ kind: "ok"|"error"|"empty"|"unknown"; ... }`)を多用。`values` は `Record<string, unknown>` に留め、renderer が `typeof` で分岐(検証して証明を捨てない)。
- **依存**: `node:fs`/`node:path`/`node:url` のみ。外部ランタイム依存なし(Bun-only 前提維持)。
- **サブコマンド分岐の雛形**: metrics 系はフラグのみ。create/sync/close の **サブコマンド分岐**は `amadeus-orchestrate.ts:3140-3149` の `switch (subcommand)` idiom(`filteredArgs[0]` を subcommand、`slice(1)` を subArgs)が参照様式。
- **lint/typecheck 配線(自動)**: `biome.json:41` includes に `"scripts/**"`、`tsconfig.json:19` に `"scripts/*.ts"`、`package.json:18` lint も `scripts/` を含む。よって **新規 `scripts/amadeus-mirror.ts` は追加のみで lint+typecheck に自動収容** — PR 側の CI 配線追加は不要(project.md「新設パッケージは lint/typecheck 配線を同一 PR で」は packages/* 向けで、scripts/ は既に配線済み)。

## 重点6: gh CLI 利用パターン

**リポジトリ内に gh CLI 呼び出しは存在しない**(`grep -rn '"gh"|execSync(.*gh|spawnSync(.*gh|\`gh ' scripts/ packages/ tests/` は実質 0 ヒット — 唯一のヒット `t-sensor-fire-hardening.test.ts:165` は「orphan」文中の偶発一致でコマンドではない)。よって mirror ツールは gh 呼び出しの **新規導入者**。倣うべき既習様式が repo 内に無いため、gh 呼び出しは `Bun.spawnSync`/`node:child_process` で実装し、A1(gh 認証済み前提)・Should(未認証 gh の loud エラー)を自前で実装する必要がある。close の `gh issue close`、create の `gh issue create`(`--label intent-mirror`)、sync の本文書換(`gh issue edit --body`)が想定される gh 面。

## close コマンドの機械検査 seam(成功指標3)

intent 完了は **単一トランザクションで2シグナルを同時に書く**(`amadeus-state.ts:1652-1667` verbatim 抜粋):

```
writeStateFile(pd, content);            // 直前で setField(content, "Status", "Completed")(:1603)
const completedIntentDir = activeIntent(pd);
if (completedIntentDir) updateIntentStatus(pd, completedIntentDir, "complete");   // intents.json 行 → "complete"
console.log(JSON.stringify({ completed, completed_count, status: "Completed", ... }));
```

- **権威シグナルA**: intents.json の当該行 `status == "complete"`(`readIntentRegistry` + `recordDirMatches`)。
- **権威シグナルB**: amadeus-state.md の `getField(state, "Status") == "Completed"`。`summarize()` の `completedStateOverlay`(`amadeus-runtime.ts:945-962`)も `getField(state, "Status") !== "Completed"` で早期 null を返し、Completed でなければ overlay を出さない。
- close の機械検査は「completedIntentDir の intents.json status == complete」または「state.Status == Completed」を実測して判定すべき(不成立で exit 1 = 成功指標3)。この完了書き込みは human-confirmed complete-workflow 経由のみで、自動推論では起きない(:1653-1656 コメント「never an automatic inference from state」)。
