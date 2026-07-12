# Code Generation Plan — run-tests-totals-seam

## 前提

- 対象は U1。`tests/run-tests.ts` の既存集計値を `coverage/tests-totals.json` に書き出す seam のみを追加する。
- Test Strategy は **Standard**。単一コンポーネントに対して5〜8件の単体テストを用意し、runner の in-process 境界を統合的に確認する。
- 新しいテストフレームワークや設定ファイルは導入しない。既存の `tests/run-tests.ts`、`tsconfig.tests.json`、`package.json` の `test:ci` / `typecheck` / `lint:check` を使用する。

## 実装計画

- [x] **Step 1: 既存 runner seam とテスト登録方式を確認する**
  - 対象: `tests/run-tests.ts`、`tests/unit/`、`tsconfig.tests.json`、`package.json`
  - `totalFiles` / `failedFiles` / `totalTests` / `totalFailed` の更新箇所と `printSummary()` 直前の非 coverage 依存経路を固定する。
  - Story traceability: A-1（tests 値の供給）、B-1（時系列値の供給）。

- [x] **Step 2: `TestsTotals` と best-effort writer を実装する**
  - 対象: `tests/run-tests.ts`
  - `{ files, failedFiles, assertions, failedAssertions }` の4キーを、SUMMARY と同じカウンタから組み立てる。
  - `coverage/tests-totals.json` へ書き、失敗は既存 `printSizeMatrix` と同様に捕捉して runner の exit code を変えない。
  - `args.coverage` に依存せず、`printSummary()` の直前で呼び出す。
  - Story traceability: A-1、B-1。

- [x] **Step 3: writer の単体テストを5〜8件追加する**
  - 必須テストファイル: `tests/unit/t220-run-tests-totals.test.ts`
  - 対象ケース: 4キー固定、カウンタ写像、成功時JSON生成、`--coverage` 非依存、書込失敗時の exit code 非変更、既存SUMMARY不変（計6件を目安）。
  - 一時ディレクトリと in-process seam を使い、実リポジトリの `coverage/` を汚さない。
  - Story traceability: A-1、B-1。

- [x] **Step 4: runner 境界の統合テストを追加する**
  - 必須テストファイル: `tests/integration/t220-run-tests-totals.integration.test.ts`
  - 最小fixtureを runner で実行し、`--ci` かつ coverage 無効でも `tests-totals.json` が生成され、SUMMARY と値が一致することを確認する。
  - Story traceability: A-1、B-1。

- [x] **Step 5: テスト設定への包含を確認する**
  - 対象: `tsconfig.tests.json`、`tests/run-tests.ts`、`package.json`
  - `tests/unit/*.test.ts` と `tests/integration/*.test.ts` が既存 discovery と typecheck に含まれることを確認する。除外される場合のみ既存設定を最小修正し、新規 `vitest.config` / `jest.config` は作らない。
  - Story traceability: A-1。

- [x] **Step 6: U1 の局所検証を実行する**
  - `bun tests/run-tests.ts --unit --filter t220-run-tests-totals`
  - `bun tests/run-tests.ts --integration --filter t220-run-tests-totals`
  - `bun run typecheck`、`bun run lint:check`
  - Story traceability: A-1、B-1。

## 完了条件

- coverage 有無にかかわらず4キーの totals が同一カウンタから生成される。
- 書き込み失敗がテスト実行結果を上書きしない。
- Standard戦略の単体テストと主要runner境界の統合テストが green になる。
