# Build and Test Results

Unit: hooks-state-bugfix
実行日時: 2026-07-05（build-and-test stage、Step 10 の新規実行）

## ビルド結果

| 項目 | 結果 |
|---|---|
| 型検査（typecheck、test:all 内） | pass |

## テスト結果

| 検証 | 結果 | 備考 |
|---|---|---|
| `npm run test:all` | pass（exit 0） | typecheck / lint / contracts / parity / wiring 系 / test:it:all（kanban 系 3 種含む）/ engine-e2e / diff:check |
| `bun run dev-scripts/evals/hooks-state-bugfix/check.ts` | pass（19/19） | 実装前 12 件 FAIL の RED 証跡は code-summary.md に記録 |
| `AmadeusValidator . 260705-hooks-state-bugfix` | pass | Per unit 確定後 fail 0 件 |
| `AmadeusValidator . 260705-engine-validator-gap` | pass | AC-5: fail 3 件 → 0 件 |

## 失敗詳細

- なし。

## カバレッジ

- 要件対応は unit-test-instructions.md の対応表で追跡（R001〜R005 各 1 検証以上、AC-1〜AC-5 充足）。
