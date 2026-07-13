# Code Generation Plan — metrics-snapshot-cli

## 前提

- 対象は U2。`scripts/metrics-snapshot.ts` に CLI、6 collector、snapshot 組み立て、アトミック writer を実装する。
- Test Strategy は **Standard**。論理コンポーネントごとに5〜8件の単体テストを置き、CLI・実ファイル・実collector境界には統合テストを置く。
- Bun/TypeScript と既存依存のみを使う。UI、DB、migration、repository層は対象外。

## 実装計画

- [x] **Step 1: 型・依存注入 seam・プロジェクト設定を定義する**
  - 対象: `scripts/metrics-snapshot.ts`、`tsconfig.json`、`tsconfig.tests.json`、`package.json`
  - `CollectorResult`、`Collector`、`Snapshot`、`CollectEnv` と、テストから呼べる `runSnapshot` export を定義する。
  - 既存 scripts のCLI起動判定・エラー出力・ファイル操作様式に合わせる。
  - Story traceability: C-1、C-2、A-2。

- [x] **Step 2: snapshot 組み立てとCLI verbsを実装する**
  - 対象: `scripts/metrics-snapshot.ts`
  - `--write` / `--check` / usage、exit 0/1、1行 verdict、fail-fast を実装する。
  - `schema_version=1`、UTC `captured_at`、`git rev-parse HEAD` の `commit`、疎結合な `collectors` を組み立てる。
  - Story traceability: C-2、B-2、A-2、A-1。

- [x] **Step 3: collector群を配列駆動で実装する**
  - 対象: `scripts/metrics-snapshot.ts`
  - `ccn`: `tests/complexity-gate.ts` の export と閾値を再利用する。
  - `coverage`: `coverage/coverage-totals.json` を検証付きで読む。
  - `loc`: `git ls-files` と静的走査で core/scripts/tests を集計する。
  - `tests`: `coverage/tests-totals.json` の4キーを検証付きで読む。
  - `test_pyramid`: `classifyTestSize` とテストパスから tier×size を集計する。
  - `dist_size`: `dist/` を再帰走査してbytesを合計する。
  - 各結果に `tool` / `tool_version` を記録し、数値は `Number.isFinite` で検証する。
  - Story traceability: A-1、B-1、B-3、C-1。

- [x] **Step 4: アトミック writer を実装する**
  - 対象: `scripts/metrics-snapshot.ts`、`metrics/`（実行時生成先。計画段階では生成しない）
  - `.json.tmp` へ書いて同一FS上で rename し、既存ファイル衝突は上書きせず失敗させる。
  - collector失敗時・書込失敗時は snapshot を生成せず、失敗collector名または失敗点を表示する。
  - serialize結果が16,384 bytes以下であることをテスト可能にする。
  - Story traceability: A-2、B-1、C-1。

- [x] **Step 5: core/CLI の単体テストを5〜8件ずつ追加する**
  - 必須テストファイル: `tests/unit/t221-metrics-snapshot-core.test.ts`
  - core対象: 全成功のschema、最初の失敗で停止、collector追加の局所性、tool metadata、16KB上限、UTC/commit写像（計6件以上）。
  - 必須テストファイル: `tests/unit/t221-metrics-snapshot-cli.test.ts`
  - CLI対象: `--write`、`--check`、引数なし、未知flag、collector失敗、writer失敗、失敗名表示（計7件以上）。
  - Story traceability: A-1、A-2、B-2、B-3、C-1、C-2。

- [x] **Step 6: collector の単体テストを5〜8件ずつ追加する**
  - 必須テストファイル: `tests/unit/t221-metrics-snapshot-collectors.test.ts`
  - collectorごとのhappy pathを最低1件、JSON不在・malformed・非有限数、git/lizard失敗、tier/size分類、空distを含める。テーブル駆動で各collector 5件相当の契約を重複なく網羅する。
  - Story traceability: A-1、A-2、B-1、B-3、C-1。

- [x] **Step 7: writer と実行境界の統合テストを追加する**
  - 必須テストファイル: `tests/integration/t221-metrics-snapshot.integration.test.ts`
  - temp→rename、連続2回で別ファイル、衝突時非上書き、失敗時 `.json` 非生成、実collectorで `--write` 10秒以内、`--check` 非書込を確認する。
  - timeout は既存様式で `10_000` を指定する。
  - Story traceability: A-1、A-2、B-1、B-2、C-2。

- [x] **Step 8: テスト設定への包含を確認する**
  - 対象: `tsconfig.json`、`tsconfig.tests.json`、`tests/run-tests.ts`、`package.json`
  - scripts と unit/integrationテストが既存 lint/typecheck/discovery に含まれることを確認する。除外時のみ最小修正し、新規テストランナー設定は作らない。
  - Story traceability: 全ストーリーの検証基盤。

- [x] **Step 9: U2 の局所・品質検証を実行する**
  - `bun tests/run-tests.ts --unit --filter t221-metrics-snapshot`
  - `bun tests/run-tests.ts --integration --filter t221-metrics-snapshot`
  - `bun scripts/metrics-snapshot.ts --check`
  - `bun run typecheck`、`bun run lint:check`、`bun run dist:check`、`bun run promote:self:check`
  - `bun tests/complexity-gate.ts --check`
  - Story traceability: A-1、A-2、B-1、B-2、B-3、C-1、C-2。

## 完了条件

- 6 collectorが実測値を返し、1つの追加が既存collectorへ変更を要求しない。
- collectorまたはwriter失敗時に部分snapshotが残らない。
- 手動 `--write` と `--check` が同じ契約を使い、Standard戦略の単体・統合テストが green になる。

## 独立レビュー修正

- [x] FDどおりの `CollectorResult` 判別union、CCN分布、CLI verdictへ修正する。
- [x] 全6 collector、fault分類、CLI成功/失敗、実CLI/atomic writer境界を補強する。
- [x] LOC末尾改行の過大計上を解消し、CCN分布値を固定recordで検証する。
