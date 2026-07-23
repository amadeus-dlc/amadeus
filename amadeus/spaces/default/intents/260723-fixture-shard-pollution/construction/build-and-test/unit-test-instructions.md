# Unit Test Instructions — 260723-fixture-shard-pollution（#1389）

上流入力(consumes 全数): code-generation-plan.md、code-summary.md。

本 B&T は code-generation-plan.md が定めた修正設計(根 = `recordEngineError` の projectDir 貫通 / 増幅 = clone-id の projectDir キー化)とテスト追加方針、および code-summary.md の実装内容・検証結果を検査対象とする(requirements.md の FR/NFR は上位の受け入れ基準として併せて参照)。

## 対象と方針

本 intent の欠陥は「in-process のエンジンエラー駆動が ambient `CLAUDE_PROJECT_DIR`(実ワークツリー)の audit へ fixture clone-id シャードを書き込む」設計非対称(FR-1)。unit 層(純関数 / module-state idiom)で第一級に固定するのは **clone-id / audit-shard 名の projectDir キー化**(FR-1(b) の増幅面)の挙動である。

実 FS を触る汚染ゼロ assertion は integration 層に置く(cid:fs-tests-integration-first)ため、unit 層の対象は projectDir キー付きメモの純粋な振る舞いに限定する。

| 対象 | ファイル | 検証内容 |
|---|---|---|
| clone-id メモの projectDir キー化 | `tests/unit/t-learnings-persist-seam.test.ts`(#877 reset-seam) | 別 projectDir は各自トークンを解決(旧単一値メモの「別 project が先行 project のトークンを再利用」挙動を、キー化後の正挙動へ更新)。同一 project はメモ維持 → `_resetCloneIdForTests` 後に再読込。FR-1(b) の必須帰結(逸脱ではない)。 |

実行(ローカル): `bash tests/run-tests.sh --ci` に unit プロファイルが含まれる。個別確認は `bun test tests/unit/t-learnings-persist-seam.test.ts`。

## ハッピーパス・エッジケース・再実行条件

- ハッピーパス: 単一 projectDir プロセスで clone-id を1度解決 → 同一値をメモから再取得(既存単一 project 挙動の非退行、requirements NFR / e1・e6 留保)。
- エッジ1: 2つの異なる projectDir が **各自の** clone-id を解決(fixture→real 混成が起きない)。
- エッジ2: reset seam `_resetCloneIdForTests()` 後は `_cloneIdByProject` / `_auditShardNameByProject` の両 Map が `clear()`(write/reset 対称)され、再読込で新値を取得。
- 再実行条件: `amadeus-lib.ts` の clone-id / shard 名メモ、または `_resetCloneIdForTests` の seam を再度触った場合は本 unit 群と integration 回帰(t258)を再実行し、単一 project 挙動の非退行を再確認する。
