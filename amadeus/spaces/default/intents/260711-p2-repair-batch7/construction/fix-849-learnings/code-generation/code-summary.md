# code-summary: fix-849-learnings — runtime-graph self-heal

Bolt: `bolt/849-learnings-selfheal`
対象 Issue: #849 — §13 learnings surface/persist が runtime-graph.json 不在で構造的に hard fail する

## 欠陥(修正前)

`packages/framework/core/tools/amadeus-learnings.ts` の `readRuntimeStageRow` は、runtime-graph.json の
(1) 不在、(2) malformed(JSON parse 失敗)、(3) slug 不在 の3経路すべてで即 `fail(..., 1)` していた。
runtime-graph.json は `.gitignore` 対象の機械ローカル生成物のため、進行中 intent の fresh clone / 新 worktree
では常に不在となり、§13 の surface が exit 1(`runtime-graph.json not found`)で確実に失敗していた。
PostToolUse の compile フックも fail-open のため、取りこぼした遷移を回復できなかった。

## 修正内容(archive `a62efe182` の契約を現行 seam へ適合)

`packages/framework/core/tools/amadeus-learnings.ts`:

- `readRuntimeStageRow` を2段に分割:
  - `tryReadRuntimeStageRow(projectDir, slug): RuntimeStageRow | null`
    不在 / malformed / slug 不在 のいずれも `null` を返す(fail しない)。
  - `readRuntimeStageRow(projectDir, slug): RuntimeStageRow`
    直接解決 → 失敗なら **1回だけ** self-heal 再 compile → 再解決。それでも不能なら復旧手順つき fail。
- 再 compile は archive の spawnSync ではなく **in-process import** で `amadeus-runtime.ts` の
  `export function compile({ projectDir })` を直接呼ぶ。理由: spawn を避けて (a) 決定性を確保し、
  (b) bun の coverage 計測が self-heal 経路を捕捉できるようにするため(bun-coverage-spawn-blindspot 回避)。
- fresh compile は audit ログから graph を丸ごと書き直すため、malformed も self-heal 対象になる。
  slug が clean な再 compile 後も不在なら真の不整合として fail(復旧手順を明示)。compile 自体が throw した
  場合も復旧手順つき fail。
- `handleSurface` を `export`(`handlePersist` 先例に倣った in-process テスト seam)。

無限リトライ防止: 再 compile は1回限り。逸脱なし(要件・archive 契約どおり、seam のみ現行へ適合)。

## テスト(RED→GREEN 実測)

新規: `tests/unit/t212-learnings-surface-selfheal-seam.test.ts`(in-process seam、4 ケース)

- 不在 graph → 再 compile 1回 → candidate を surface(exit 0、graph が生成される)
- malformed graph → 再 compile 1回 → surface(exit 0)
- 再 compile が throw(runtime-graph.json パスをディレクトリ化)→ exit 1、`re-compile failed` + `Recovery:`
- clean 再 compile 後も slug 不在(audit が別 stage のみ)→ exit 1、`even after re-compile` + `Recovery:`

RED(修正前 dist、CLI spawn): 不在 graph で surface → `exit=1`, `runtime-graph.json not found`, graph 未生成。
GREEN(修正後 dist、同 repro verbatim): `exit=0`, graph が self-heal で生成(present after=yes), candidate 1件 surface。

lcov(local, in-process seam): `readRuntimeStageRow` / `tryReadRuntimeStageRow` の追加行(dist:161-181, 132-149)
すべて hits ≥ 1(compile-failure catch 分岐 171-174 を含め被覆確認済み)。

seam テストは `covers:` ヘッダを持たない(兄弟の t-learnings-persist-seam / t-runtime-learnings-seam と同様の
純 lcov seam)ため coverage registry を変更しない。テスト番号は兄弟 Bolt の t211 系と衝突回避のため t212 を使用。

## 同根棚卸し(runtime-graph.json を読む他ツール/フック)

grep 対象: `tools/{amadeus-runtime,amadeus-orchestrate,amadeus-bolt,amadeus-swarm,amadeus-lib}.ts`,
`hooks/amadeus-runtime-compile.ts`。

- `amadeus-orchestrate.ts` `readBoltDagBatches` / `amadeus-swarm.ts`: 不在は fail-safe に `null`(正当な分岐、
  swarm 不発火)。hard fail なし。
- `amadeus-bolt.ts`: fragment fork/merge の文脈で graph は構築上存在が前提。
- `amadeus-runtime-compile.ts`: compile の書き手そのもの。

→ 「不在 hard fail(self-heal なし)」の同型欠陥は `amadeus-learnings.ts` のみ。他所への修正は不要(記録のみ)。

## 配布物同期

`bun scripts/package.ts` + `bun run promote:self` を同一コミットに含める(7面: core + dist/claude・codex・kiro・
kiro-ide + self-install .claude・.codex の amadeus-learnings.ts)。`dist:check` / `promote:self:check` ともに green。

## 検証(exit code)

| チェック | exit |
|---|---|
| `bun run typecheck` | 0 |
| `bun run lint` | 0(complexity は既存関数の非ブロッキング warning のみ) |
| `bun run dist:check` | 0 |
| `bun run promote:self:check` | 0 |
| `bun tests/complexity-gate.ts --check` | 0(0 new violations, 0 regressions) |
| `bun tests/gen-coverage-registry.ts --check` | 0(fresh, ratchet held) |
| 関連テスト(各ファイル isolation / 実 harness) | 0 |

補足(pre-existing flakiness、本 Bolt と無関係): `t133-bolt-dag-compile` と `t-learnings-persist-seam` を
**同一 `bun test` 呼び出しにバッチ**すると persist seam が 2 件落ちる。HEAD(本修正なし)でも同一再現のため
pre-existing。実 CI harness(`tests/run-tests.ts`)は各ファイルを個別 `bun test <file>` プロセスで実行する
(per-file isolation)ため CI では発現しない。leader へ Issue 化候補として報告する。
