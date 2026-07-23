# Integration Test Instructions — 260723-fixture-shard-pollution（#1389）

上流入力(consumes 全数): code-generation-plan.md、code-summary.md。

本 B&T は code-generation-plan.md が定めた修正設計(根 = `recordEngineError` の projectDir 貫通 / 増幅 = clone-id の projectDir キー化)とテスト追加方針、および code-summary.md の実装内容・検証結果を検査対象とする(requirements.md の FR/NFR は上位の受け入れ基準として併せて参照)。

## 対象と方針

回帰の第一級成果物(FR-3)は「in-process error 駆動が **ambient record を汚染しない**」ことを直接 assert する integration テストである。実 FS を使うため integration 層に置く(cid:fs-tests-integration-first)。canonical import 駆動で lcov を canonical 行へ帰属させ(t248 系と同一様式)、spawn 盲点を避ける。

**テスト番号の正準化(重要)**: code-generation 段では本回帰テストを `t257-engine-error-ambient-shard-pollution.test.ts` として作成したが、origin/main へ #1407 が着地した際に **`t258-engine-error-ambient-shard-pollution.test.ts`** として正準化された(`t257` は main 側で別 intent の `t257-ci-residency-marker-guard.integration.test.ts` に割当済み — cid:code-generation:swarm-test-number-reservation のテスト番号衝突)。本 worktree の origin/main マージ解消時に、内容同一の重複 `t257-engine-error-*` を削除し **t258 を正準**として採用した。coverage registry も t258 行を維持している。

| 対象 | ファイル | 検証内容 |
|---|---|---|
| 汚染ゼロ回帰(FR-3) | `tests/integration/t258-engine-error-ambient-shard-pollution.test.ts`(正準) | ambient fake project を `CLAUDE_PROJECT_DIR` に、別 temp `target` を `handleReport` へ渡し in-process エラー駆動 → **ambient の audit がシャード 0**、target に 1。clone-id 混成なし。単一 projectDir 経路の挙動不変。reset seam。 |
| 犯人テストの env 隔離(FR-2) | `tests/integration/t248-stage-contract-routing.test.ts:507`(coverage-gate ケース) | `withStageEnv` に `CLAUDE_PROJECT_DIR: project` を明示(既習 `advanceInProcess:420-431` 様式)。 |
| coverage registry 同期 | `tests/.coverage-registry.json` | t258 行の in-process import を登録(gen-coverage-registry 再生成、cid:integration-registry-regen)。 |

実行: `bash tests/run-tests.sh --ci`(integration プロファイル含む)。個別: `bun test tests/integration/t258-engine-error-ambient-shard-pollution.test.ts`。

## 閉包の逆転確認と再実行条件

- **origin 再現の逆転(cid:fix-review-replays-origin-repro)**: Issue #1389 の e4 再現(ambient record にシャードが出現)を verbatim 逆転で確認する — scratch に fake project(`amadeus-state.md` + `active-intent` cursor + `intents.json` + `.amadeus-clone-id`)を立て、`CLAUDE_PROJECT_DIR=<fake> bun test tests/integration/t248-stage-contract-routing.test.ts -t "coverage-gate"` を実行 → fake の `audit/` にシャードが **生成されないこと** を `find` で assert(修正前は生成された)。実測結果は build-test-results.md に転記する。
- 再実行条件: `recordEngineError` の projectDir 貫通、`emit()` の集約点、`_handlerProjectDir` の set サイト(`handleNext` / `handleReport` / `main`)を再度触った場合は t258 回帰と閉包逆転確認を再実行する。
