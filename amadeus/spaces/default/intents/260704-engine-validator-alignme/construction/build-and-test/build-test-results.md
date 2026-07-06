# Build and Test Results

実行日時：2026-07-04（build-and-test ステージ内で実行）

## ビルド結果

| コマンド | 結果 |
|----------|------|
| `npm run typecheck`（tsc --noEmit） | 成功（exit 0、エラーなし） |

## テスト結果

| コマンド | 結果 |
|----------|------|
| `npm run test:it:amadeus-validator` | pass（`amadeus validator eval: ok`。V18〜V20 の追加検証を含む） |
| `npm run test:it:engine-e2e` | pass（`engine e2e eval: ok`。FR-1.1、FR-3.1、FR-3.2、FR-4 の検証を含む） |
| `npm run test:all` | pass（exit 0。typecheck、lint、contracts、parity、wiring、全 evals、diff:check を含む全件） |

失敗、スキップはなし。

## 補足

- `test:all` のうち parity eval は sandbox 内で `git init` が `Operation not permitted` になるため、sandbox 外で実行して pass を確認した（build-instructions.md のトラブルシューティング参照）。
- カバレッジレポートは check.ts 方式のため出力されない。要件との対応は unit-test-instructions.md の表で管理する。
- 修正後の `amadeus-learnings.ts surface` は、本ワークフローの code-generation ステージの実 diary に対して `memory_entries_total: 6`、`phase: "construction"` を返すことをセッション内で確認済み（FR-4 の実地確認）。
