上流入力(consumes 全数): (chore スコープにより設計ステージは SKIP — 要件は Issue #1199 直参照)

# code-generation プラン: state CLI の `--intent` / `--space` セレクタ追加

## 目的(Issue #1199)

state CLI(正本: `packages/framework/core/tools/amadeus-state.ts`)の active-intent 限定 verb のうち **`get` / `set` / `checkbox` / `count` の4 verb** に、fork/merge 系 verb と同型の `--intent <record-dirname>` / `--space <name>` セレクタを追加する。既定挙動(セレクタ無指定)はバイト同一、不在 intent/space は fail-closed(exit 1)、`set`/`checkbox` のエラー監査行(ERROR_LOGGED)は対象 intent の record 側 audit シャードへ帰属させる(#1170 同族ハザードの封鎖)。

## 対象4関数(現状 file:line、いずれも `readStateFile(pd)` をセレクタなしで直呼び)

- `handleGet` — `packages/framework/core/tools/amadeus-state.ts:518`(read-only、ロックなし)
- `handleSet` — `:530`(`withAuditLock(pd, () => {...})` = sentinel バケット、read→validate→write)
- `handleCheckbox` — `:767`(`withAuditLock(pd, () => {...})` = sentinel バケット、parse→read→apply→count→write)
- `handleCount` — `:804`(read-only、ロックなし)

## 流用する fork/merge のセレクタ機構(実測 file:line)

- `handleFork` — `:3739`。`const intent = flags.intent; const space = flags.space;`(`:3749-3750`)、`const resolvedIntent = activeIntent(pd, space, intent) ?? undefined;`(`:3768`)、`lockIntent = resolvedIntent; lockSpace = space;`(`:3773-3774`)、`withAuditLock(pd, fn, resolvedIntent, space)`(`:3810`,`:3880`)、`readStateFile(pd, resolvedIntent, space)`(`:3813`)、`writeStateFile(pd, mainNow, resolvedIntent, space)`(`:3854`)。設計コメント「resolvedIntent (not raw flags.intent) makes LOCK == WRITE even when --intent is omitted」(`:3808-3809`)。
- `handleMerge` — `:3909`(同型)。
- ヘルパー実測: `activeIntent(pd, space?, explicit?)` = `amadeus-lib.ts:1198`。`if (explicit) return explicit;`(`:1204`)— explicit を存在検証せずそのまま返す。`readStateFile(pd, intent?, space?)` = `amadeus-lib.ts:3787`、不在時 `throw new Error("State file not found: ...")`(`:3789-3791`)。`writeStateFile` = `:3795`。`withAuditLock(pd, fn, intent?, space?)` = `amadeus-lib.ts:4573`、`auditLockIdentity(pd, intent, space)` で per-intent バケットを鍵化(`:4579`)。`error()` = `amadeus-state.ts:4101` → `emitError(pd, "amadeus-state", command, msg, lockIntent, lockSpace)`(`:4111`)。`emitError` = `amadeus-lib.ts:5879`、`holdsAuditLock(pd, intent, space)` が true なら unlocked append を対象 intent のシャードへ(`:5916-5921`)。

## 設計方針(重複実装せず、fork 機構を流用)

### 1. セレクタ抽出ヘルパー(新規、`amadeus-state.ts` に配置)

`get/set/checkbox/count` は fork/merge と違い**位置引数**(field / field=value / slug=state / state)を取るため、`parseFlags`(全引数を flag 化)は使えない。位置引数を保ちつつ `--intent` / `--space` だけを取り出す小ヘルパー `extractIntentSelector(args)` を新設(export、`function:` 単位として coverage-registry には登録されない — `enumerateExportedFunctions` は `amadeus-lib.ts`/`amadeus-graph.ts` のみ走査 `tests/gen-coverage-registry.ts:559-562`)。

- トークン全体一致で `--intent`/`--space` のみ消費(`Foo=a=b` のような value に `=` を含む operand や、substring 一致は誤消費しない)。
- 戻り値 `{ intent?, space?, rest }`。`--project-dir` は `main()` が dispatch 前に splice 済み(`:405-409`)のためヘルパーには到達しない。

### 2. 既定挙動のバイト同一 + lock バケット不変(regression 回避)

fork は無指定でも `resolvedIntent = activeIntent(...)` で active record 名を得て per-intent ロックする。しかし `set`/`checkbox` を含む fork/merge 以外の全 verb は現状 **sentinel バケット**でロックしており(`withAuditLock(pd, () => {...})`、`amadeus-state.ts` 全17 call site を実測: fork `:3810`・merge `:3962` 以外は intent 引数なし)、`approve`/`advance` 等の workflow 遷移 verb も sentinel。ここで `set`/`checkbox` の**無指定既定**を per-intent バケットへ変えると、同一 active intent 上の並行 `set`+`approve` が別バケットになり直列化が崩れる(lost-update regression)。

したがって:

```
const { intent, space, rest } = extractIntentSelector(args);
const selected = intent !== undefined || space !== undefined;
const resolvedIntent = selected ? (activeIntent(pd, space, intent) ?? undefined) : undefined;
```

- **無指定** → `resolvedIntent = undefined` → `readStateFile(pd, undefined, undefined)`(= active cursor の state file)、`withAuditLock(pd, fn, undefined, undefined)`(= sentinel バケット)。従来と**バイト同一かつ lock バケット同一**。t145(lock-concurrency)の N 並行 `set`(無指定)は従来どおり sentinel で直列化。
- **指定** → `resolvedIntent`/`space` を read/write/lock へスレッド。対象が非 active intent なら、その intent 上で sentinel-locked verb(approve/advance は常に active を対象)が並行しないため per-intent ロックで安全(fork と同じモデル)。

### 3. fail-closed(不在 intent/space)

`activeIntent` は explicit を存在検証せず返すため、不在指定は `readStateFile(pd, resolvedIntent, space)` が `State file not found: <path>` を throw → `main()` の try/catch → `error()` → exit 1。`set`/`checkbox` は read が lock 内先頭なので同様に throw して fail-closed。無言フォールバックなし(fork と同じ「downstream throw」機構を流用)。

### 4. 監査行の帰属(`set`/`checkbox`、#1170 封鎖)

`set`/`checkbox` は成功時は監査行を出さない(state 変更は state-machine event に乗らない — `:599-603` の設計コメント「rides no event, exactly like set itself」を実測)。**唯一の監査行はエラー時の `ERROR_LOGGED`**(`error()`→`emitError`)。fork/merge と同じく、選択時は `lockIntent = resolvedIntent; lockSpace = space;` を lock 取得前に設定し、成功後(および finally で)クリアする。これにより per-intent lock 保持中に fire した `ERROR_LOGGED` は `holdsAuditLock(pd, resolvedIntent, space)=true` 経路で**対象 intent のシャード**へ unlocked append される。無指定時は `lockIntent`/`lockSpace` を undefined のままにし sentinel へ(現状同一)。`get`/`count` は read-only でロックを持たず、要件の監査帰属は `set`/`checkbox` に限定されるため `lockIntent` は設定しない(不在 intent の ERROR_LOGGED は対象シャードが存在しないため active/sentinel でよい — 最小変更)。

### 5. 既存様式の踏襲

- arrow body の非追加インデント様式(`:537-591` の `withAuditLock(pd, () => {` 直下 2 space)を保存。
- handleSet の `pairs` ループ等で**クロージャ(arrow callback)を新規追加しない**(`:544-546` の complexity-baseline ordinal 保護コメントに従う)。`extractIntentSelector` は plain `for` ループ(CCN ~6、< 15 なので complexity baseline 不要)。
- コードコメントは英語、命名は既存 camelCase。
- `handleGet`/`handleCheckbox`/`handleCount` を coverage seam のため `export` 化(`amadeus-state.ts` は `enumerateExportedFunctions` の走査対象外なので registry 影響なし)。usage 文字列に `[--intent <record>] [--space <name>]` を追記(既存 usage 文字列を assert するテストは無し=実測)。

## テスト設計(`tests/integration/t256-state-intent-selector.test.ts`)

t224 のパターン(dist から import + captureExit で in-process 駆動 + createTestProject/seedStateFile fixture)を踏襲。in-process import は runner が `dist/claude/.claude/tools/amadeus-state.ts` の lcov パスを canonical `packages/framework/core/tools/amadeus-state.ts` へ正規化(`tests/lib/coverage-source-path.ts:51-63`)するため canonical 行が被覆される。

- **extractIntentSelector 単体(in-process)**: `--intent`/`--space` 抽出・rest 保持、無指定時 rest=全 args、`Foo=a=b` operand 保存、selector が operand 間に散在するケース。
- **(b) 既定挙動不変**: 無指定 `handleSet`/`handleGet` が active intent を対象に従来どおり動作(exit 0、stdout `updated:true`、active state file 変化、byte 比較)。
- **(a) 非 active intent への round-trip**: active A + 非 active B を用意し、`set --intent B` / `checkbox --intent B` で B の state が変化し A は byte 不変。
- **(c) 不在 intent の loud error**: `set`/`get --intent ghost` および `--space nonexistent` が throw(captureExit threw=true、A/B 不変)。
- **(d) 監査帰属(spawn、fresh process)**: `set --intent B GhostField=x`(B に不在 field)を dist tool で spawn → exit≠0、B の audit シャードに `ERROR_LOGGED`、A の audit シャードには無し(#1170 封鎖の実証)。成功 `set --intent B` は両シャードに監査行を出さない(rides-no-event + no-pollution)。※ `_errorEmitInProgress` は process 内で 1 回のみ append するため監査 assert は spawn(fresh process)で行い、行被覆は in-process (a)/(c) が担う。
- **(e) get/count の対象 intent 読取**: B の state を直接編集して distinct 値にし、`get --intent B` / `count --intent B` が B の値を返す(A と異なることを assert)。

落ちる実証: (d) の帰属は `lockIntent=resolvedIntent` を外すと sentinel 経由で A のシャードへ流れ red になることをローカルで一時確認(注入→red→revert、コミットしない)。

## 検証コマンド(全て同期実行、exit code 記録)

1. `bun scripts/package.ts`(dist 再生成)
2. `bun run promote:self`(セルフインストール更新)
3. `bun run typecheck`
4. `bun run lint`
5. `bun run dist:check`
6. `bun run promote:self:check`
7. `bun test tests/integration/t256-state-intent-selector.test.ts tests/integration/t224-state-set-failclosed.test.ts tests/integration/t145-state-lock-concurrency.test.ts tests/unit/t17.test.ts`
8. `bun tests/gen-coverage-registry.ts --check`(registry drift 0 確認)
9. `bun tests/complexity-gate.ts --check`
10. ローカル lcov で追加行の未カバー 0 を確認(`bun run coverage:ci` 相当 + `bun tests/coverage-patch-gate.ts --check`)

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-22T09:25:26Z
- **Iteration:** 1
- **Scope decision:** none

READY: plan/summary pair is rigorous with real exit codes and a falling proof; one non-blocking format deviation (plan lacks the stage checkbox/step template) accepted and recorded in the stage memory.md; spot-check of amadeus-state.ts declined (no passed consume can own the integration ID under the chore degrade scope) and replaced by conductor direct verification of the cited symbols.

### Findings

- Moderate (non-blocking): code-generation-plan.md does not use the stage-mandated checkbox/Step-N format; substance is complete; conductor accepted and recorded the deviation in the stage memory.md.
- Informational: requirements cited from GitHub Issue #1199, which is the captured intent's origin (Project field references #1199).
- No cross-reference or soundness defects found across the plan/summary pair; verification evidence quality good (13 commands with real exit codes, fault-injection falling proof reverted before commit).
