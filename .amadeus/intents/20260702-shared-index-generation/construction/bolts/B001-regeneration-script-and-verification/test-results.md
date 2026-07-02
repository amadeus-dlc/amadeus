# テスト結果

## 検証結果

| 種別 | コマンドまたは確認 | 結果 | 証拠 |
|---|---|---|---|
| 検証（RED） | `IndexGenerate.ts` 未実装の状態で `npm run test:it:index-generate` が `Cannot find module ... IndexGenerate` で失敗することを確認 | pass（失敗を確認） | 実行結果（2026-07-02） |
| 検証（GREEN） | `npm run test:it:index-generate`（決定論性、マーカー、CLI と export 関数の一致、冪等性、並行統合の辞書順、見出し契約違反の失敗、`--check` の不一致検出と一致時 exit 0） | pass | 実行結果（2026-07-02、exit 0） |
| 型検査 | `npm run typecheck` | pass | 実行結果（2026-07-02、exit 0） |
| lint | `npm run lint:check` | pass | 実行結果（2026-07-02、exit 0） |
| 昇格同期 | `bun run dev-scripts/promote-skill.ts amadeus-validator --replace` と `npm run test:it:promote-skill` | pass | 実行結果（2026-07-02） |
| 標準検証 | `npm run test:all`（`test:it:index-generate` を連鎖に追加済み） | pass | exit code 0（2026-07-02） |

## 安全性確認

| 観点 | 結果 | 根拠 |
|---|---|---|
| 入力 | 問題なし | スクリプトは workspace 内の `.amadeus/` 配下の Markdown と JSON の読み書きだけを行い、`.amadeus/` がない workspace と見出し契約違反では対象を示して失敗する。 |
| 権限 | 問題なし | アクセス制御や権限の変更を含まない。 |
| 秘密情報 | 問題なし | 秘密情報や個人情報を扱わない。 |
| 破壊的変更 | 問題なし | 書き込みは `intents.md` と `discoveries.md` の 2 ファイルに限定され、配下モジュールと `state.json` は読み取りのみ（INV001）。検証は一時ディレクトリの fixture だけを使う。実 workspace への適用は B004 で行い、B001 では実行していない。 |

## CI確認

| 入口 | 結果 | 根拠 |
|---|---|---|
| GitHub Actions（mock）、Cursor Bugbot | 未実行 | PR 未作成のため。PR 作成後に確認し、結果は pr.md と PR 説明から追跡する。 |

## 受け入れ証拠

| 要求 | タスク | 証拠 | 要約 |
|---|---|---|---|
| R001 | B001/T002 | 見出し契約違反の失敗ケース | `## 概要` と `## 依存` を定義元とする契約が実装され、違反は対象と不足を示して失敗する。 |
| R002 | B001/T002 | 決定論性、冪等性、並行統合、`--check` のケース | 同じ入力から同じ出力、並行追加の統合で両方の行が辞書順に含まれることを固定入力で確認した。 |
| R003 | B001/T002 | マーカーのケース | 出力先頭が生成マーカーの HTML コメント 1 行 + 空行であることを確認した。 |
| R005 | B001/T003 | promote 実行結果と `test:it:promote-skill` の pass | source と昇格先が同期され、昇格先スクリプトが配布先相当で実行できる。 |
| R007 | B001/T001 | RED の記録と GREEN の pass | 失敗する検証を先行追加し、実装後に GREEN を確認した。 |

## 補足

- promote 同期は当初 B003 の責務としたが、`npm run test:all` の promote 一致検査が source と昇格先の同期を常に強制するため、B001 の T003 として実施した（詳細: notes.md）。B003 では writer skill の変更分の promote を行う。
- 依存関係表の生成規則（複数依存 = 複数行）は現行実ファイルの手書き結合形式と行粒度が異なる。既存 validator の検査とは互換であることを確認済みで、migration での扱いは B004 で確定する（詳細: notes.md）。
