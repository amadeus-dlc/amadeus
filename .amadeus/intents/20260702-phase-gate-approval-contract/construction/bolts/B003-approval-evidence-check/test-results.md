# テスト結果

## 検証結果

| 種別 | コマンドまたは確認 | 結果 | 証拠 |
|---|---|---|---|
| 実挙動確認 | approval evidence を除去した state.json の複製 workspace に対して現行 validator を実行し、「Task Generation passed は approval evidence を持つ」の fail が出ることを確認 | pass | 実行結果（2026-07-02、一時ディレクトリ） |
| eval | `npm run test:it:amadeus-validator`（追加 3 ケース: passed×approval なし→fail、passed×approval あり→approval fail なし、ready_for_approval→approval fail なし） | pass | 実行結果（2026-07-02） |
| 標準検証 | `npm run test:all` | pass | exit code 0（2026-07-02、作業ツリー内） |
| pass 維持 | workspace 全体（`.amadeus/intents/**` の `passed` 34 件を含む）と examples が validator で pass を維持することを `validate:all` を含む標準検証で確認 | pass | `npm run test:all` の pass |

## 安全性確認

| 観点 | 結果 | 根拠 |
|---|---|---|
| 入力 | 問題なし | eval は一時ディレクトリへ複製した fixture だけを改変し、成功時も失敗時も既存の後片付けに従う。 |
| 権限 | 問題なし | アクセス制御や権限の変更を含まない。 |
| 秘密情報 | 問題なし | 秘密情報や個人情報を含まない。 |
| 破壊的変更 | なし | validator 本体は変更しておらず、eval の追加だけである。 |

## CI確認

| 入口 | 結果 | 根拠 |
|---|---|---|
| GitHub Actions（mock）、Cursor Bugbot | 未実行 | PR 未作成のため。PR 作成後に確認し、結果は pr.md と PR 説明から追跡する。 |

## 受け入れ証拠

| 要求 | タスク | 証拠 | 要約 |
|---|---|---|---|
| R004 | B003/T001 | `dev-scripts/evals/amadeus-validator/check.ts` の差分と eval の pass | 承認 evidence なしの `passed` が fail になり、`ready_for_approval` は approval なしで pass することが回帰 eval に固定された。 |
| R004 | B003/T002 | notes.md の実装判断と実挙動確認 | 検査は既に実装済み（`taskGenerationContract.allowedStateMatrix` 由来）であることを確認し、validator の変更は不要と判断した。RED は検査が既存のため成立せず、改変 fixture の fail 検証で代替した。 |
| R005 | B003/T002 | source と昇格先の validator の md5 一致 | validator は未変更のため promote 実行は不要で、同期は維持されている。 |
