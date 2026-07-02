# Test Results

## 検証結果

| コマンド | 結果 | 証拠 |
|---|---|---|
| `npm run test:it:provenance-check`（実装前） | fail（RED） | `drift 検出件数が期待と異なる（期待 5 件）`。スクリプト不在によるモジュール解決エラーで期待出力が得られず、eval が実装前に失敗することを確認した。 |
| `npm run test:it:provenance-check`（実装後） | pass（GREEN） | `provenance check eval: ok`。drift 3 種（md5 不一致、commit 不一致、参照先欠落）、スキーマ不適合、対象なし exit 0、入力エラー exit 1、遡及除外、絶対 path 非照合を検証。 |
| `npm run provenance:check -- .`（実 workspace） | pass | 検出 0 件、exit 0（`provenance/` を持つ Intent が 0 件のため期待どおり）。 |
| `npm run test:all` | pass | `test:it:all` 連鎖の末尾で `test:it:provenance-generate` と `test:it:provenance-check` が実行されることを確認した。 |

## 安全性確認

- 照合は `git show <記録commit>:<path>` による読み取りだけで行い、working tree を変更しない。
- `buildWorkspace.path` と `targetWorkspace.path` は読まない実装で、絶対 path 非照合（BR009）を機械的に保証した。

## CI確認

- PR 未作成のため GitHub Actions は未実行である。ローカルで `npm run test:all` の pass を確認した。

## 受け入れ証拠

| 要求 | タスク | 証拠 | 要約 |
|---|---|---|---|
| R002 | B002/T001 | 本ファイルの RED 記録 | eval が実装前に失敗することを確認した（TDD 記録）。 |
| R002 | B002/T002 | 本ファイルの GREEN 記録 | 記録と実測のずれ 3 種を検出して exit 1 で報告できる。 |
| R003 | B002/T002 | 本ファイルの `npm run test:all` 記録 | 照合が標準検証の chain に含まれ、drift があると fail する。 |
