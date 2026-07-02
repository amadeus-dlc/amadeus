# Test Results

## 検証結果

| コマンド | 結果 | 証拠 |
|---|---|---|
| `npm run test:it:provenance-generate`（実装前） | fail（RED） | `error: Module not found ".../dev-scripts/provenance-generate.ts"`。eval が実装前に失敗することを確認した。 |
| `npm run test:it:provenance-generate`（実装後） | pass（GREEN） | `provenance generate eval: ok`。9 項目スキーマ、Pnnn 採番と上書きなし、未コミット変更の入力エラー、Intent 不在の失敗、stage0 未判断の present:false/reference:null を検証。 |
| `bun run .agents/skills/amadeus-validator/validator/AmadeusValidator.ts . 20260702-provenance-mechanization` | pass | 不足または矛盾: なし。 |

## 安全性確認

- スクリプトは workspace 内の path、commit、md5 の実測と記録だけで完結し、秘密情報や認証情報を扱わない。
- 既存ファイルを上書きしない採番（欠番非再利用）を eval で検証した。

## CI確認

- PR 未作成のため GitHub Actions は未実行である。ローカルで `npm run test:all` の pass を確認した（`test:it:provenance-generate` を含む）。

## 受け入れ証拠

| 要求 | タスク | 証拠 | 要約 |
|---|---|---|---|
| R001 | B001/T001 | 本ファイルの RED 記録 | eval が実装前に失敗することを確認した（TDD 記録）。 |
| R001 | B001/T002 | 本ファイルの GREEN 記録 | `provenance:generate` の出力が policies.md の最低記録項目 9 項目 + schemaVersion + generatedAt を満たす。 |
