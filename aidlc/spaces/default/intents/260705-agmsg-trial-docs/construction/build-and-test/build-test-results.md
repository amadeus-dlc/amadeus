# Build and Test Results

Unit: agmsg-trial-docs
実行日時: 2026-07-05T15:20Z 頃（build-and-test stage）

## ビルド結果

| 項目 | 結果 |
|---|---|
| repo 標準ビルド・型検査（`npm run test:all` 内） | pass |

## テスト結果

| 検証 | 結果 | 備考 |
|---|---|---|
| `npm run test:all` | pass（exit 0） | typecheck / lint / contracts / parity / wiring 系 / test:it:all / engine-e2e / diff:check を含む repo 標準検証。本 Intent はコード変更なしのため回帰なし |
| `AmadeusValidator . 260705-agmsg-trial-docs` | pass | 初回実行は fail（reverse-engineering の record 内 produces 不在 9 件）。前例 260705-codekb-refresh と同じ参照台帳 stub（正本 codekb/amadeus/ への参照）を record に置いて解消し、再実行で pass |
| 秘密情報スキャン | pass | 成果物 3 文書と received-messages.md に資格情報・トークンの該当なし（公開 Issue URL と役割名のみ） |
| 定型文実例の逐語一致（BR-2） | pass | code-generation ステージで diff によるバイト単位一致を確認済み（reviewer 再検証済み） |

## 失敗詳細

- なし（validator の初回 fail は上表のとおり構造整合で解消済み）。

## カバレッジ

- 要件対応は [unit-test-instructions.md](unit-test-instructions.md) の対応表で追跡（FR-1〜FR-4、NFR-2 に検証あり）。
- コード由来の検証（単体・統合・性能・セキュリティのコードテスト）は対象コード不在のため不適用（各 instruction の適用判断を参照）。
