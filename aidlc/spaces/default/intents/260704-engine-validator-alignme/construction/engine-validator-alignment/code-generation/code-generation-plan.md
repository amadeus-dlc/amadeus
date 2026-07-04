# Code Generation Plan — engine-validator-alignment

Unit: engine-validator-alignment（bugfix scope、単一 unit）
Source: requirements.md（FR-1〜FR-4、NFR-1〜NFR-2、AC-1〜AC-3）

方針: dev-scripts のルールに従い、各 FR について先に失敗する検証（RED）を追加してから修正する（NFR-1）。
テスト戦略は Minimal（要件 1 件につき検証 1 件）。
既存 record（`aidlc/spaces/**`）は書き換えない（NFR-2）。

## 対象ファイル（調査済み）

- エンジン：`.agents/amadeus/tools/amadeus-lib.ts`（`status: "in-flight"` を書く 2 箇所：mintIntentRecord 系 L1066、L1229）
- エンジン：`intent-birth` の state 初期化経路（`Construction Autonomy Mode` の既定値書き込み先）
- validator：`.agents/skills/amadeus-validator/validator/AmadeusValidator.ts`（`registryStatusValues` L39、`repos` 配列要求 L341-345）
- validator：`.agents/skills/amadeus-validator/validator/lifecycle-v2.ts`（`checkPhaseEvents` L300-314、`Construction Autonomy Mode` 検査 L161-162）
- learnings：`.agents/amadeus/tools/amadeus-learnings.ts`（`phase = memRel.split("/")[1]` L197 が `spaces` を返す。`memory_entries_total: 0` の原因は要調査）
- テスト：`dev-scripts/evals/amadeus-validator/check.ts`（fixtures あり）、`dev-scripts/evals/aidlc-state/check.ts`、ほか関連 evals

## Steps

- [x] Step 1: RED — FR-1 の検証を追加する。
  (a) intent-birth が registry に `status: in_progress` を書くことを検証する（現状 `in-flight` で fail）。
  (b) validator が既存 record の `in-flight` を許可値として pass することを検証する（現状 fail）。
- [x] Step 2: RED — FR-2 の検証を追加する。エンジンが実際に記録する小文字 phase 表記（`**Phase**: ideation` / `**Phase boundary**: initialization → inception`）で `PHASE_VERIFIED` / `PHASE_SKIPPED` の照合が pass することを検証する（現状 fail）。
- [x] Step 3: RED — FR-3 の検証を追加する。
  (a) intent-birth 直後の registry エントリに `repos` 配列が存在することを検証する。
  (b) state 初期化直後の `aidlc-state.md` に `Construction Autonomy Mode: unset` が存在することを検証する。
  (c) validator が `repos` / `Construction Autonomy Mode` 未設定の既存 record を fail にしないことを検証する。
- [x] Step 4: RED — FR-4 の検証を追加する。canonical 見出し配下にエントリを持つ memory.md に対して `amadeus-learnings.ts surface` が実エントリ数と正しい phase を返すことを検証する（現状 `memory_entries_total: 0`、`phase: "spaces"` で fail）。
- [x] Step 5: GREEN — FR-1 実装。`amadeus-lib.ts` の 2 箇所を `in_progress` に変更し、`AmadeusValidator.ts` の `registryStatusValues` に後方互換として `in-flight` を追加する。
- [x] Step 6: GREEN — FR-2 実装。`checkPhaseEvents` の照合を大文字小文字非依存にする（既存 record の大文字表記も pass を維持する）。
- [x] Step 7: GREEN — FR-3 実装。intent-birth が `repos` の既定値を書き（導出方法は `resolveConstructionRepo` の推論規則を確認して決定。決定は code-summary.md に記録）、state 初期化が `Construction Autonomy Mode: unset` を書き、validator は両フィールドの未設定を許容する。
- [x] Step 8: GREEN — FR-4 実装。`memory_entries_total: 0` の原因を特定して修正し、phase 解決（`spaces` になる件)も record path 構造に合わせて修正する。
- [x] Step 9: 全体確認。`npm run test:all` を実行し、追加した検証を含めて全件 pass させる（AC-3）。既存 record の非改変（NFR-2）は `git status` で `aidlc/spaces/**` の既存ファイルに差分がないことで確認する。

## トレーサビリティ

| Step | 要件 |
|------|------|
| 1, 5 | FR-1（AC-1） |
| 2, 6 | FR-2（AC-1、AC-2） |
| 3, 7 | FR-3（AC-1、AC-2） |
| 4, 8 | FR-4 |
| 1-4 | NFR-1（RED 先行） |
| 9 | AC-3、NFR-2 |

## テスト方針の注記

- 本リポジトリのテストは vitest / jest ではなく dev-scripts/evals 配下の check.ts 方式である。既存の check.ts / fixtures 構成に合わせて追加し、新しいテスト基盤は導入しない。
- 検証は要件駆動で最小限（Minimal）。FR ごとに 1 検証を基本とし、FR-2 のみ `PHASE_VERIFIED` と `PHASE_SKIPPED` の 2 形式を対にして扱う。
