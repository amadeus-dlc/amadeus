# テスト結果

## 検証結果

| 種別 | コマンドまたは確認 | 結果 | 証拠 |
|---|---|---|---|
| eval（RED） | スクリプト未実装の状態で `npm run test:it:list-unfinalized-intents` が「検出スクリプトが存在しません」で失敗することを確認 | pass（失敗を確認） | 実行結果（2026-07-02） |
| eval（GREEN） | `npm run test:it:list-unfinalized-intents`（未 finalize あり・なし・対象外・入力エラー・引数なしの 5 ケース、D002 の入出力契約） | pass | 実行結果（2026-07-02） |
| 標準検証 | `npm run test:all`（`test:it:list-unfinalized-intents` を `test:it:all` の連鎖に追加済み） | pass | exit code 0（2026-07-02） |
| 実挙動確認 | 実 workspace への実行で、実在の未 finalize Intent（`20260702-internal-skill-policy-alignment`）を 1 行 1 件・exit 0 で検出 | pass | 実行結果（2026-07-02） |
| 配布先相当 | eval は昇格先（`.agents/skills/amadeus-construction/scripts/`）を直接実行し、repo root の開発用スクリプトを参照しない | pass | eval の実装 |

## 安全性確認

| 観点 | 結果 | 根拠 |
|---|---|---|
| 入力 | 問題なし | 引数不足と存在しない workspace は exit 1、`.amadeus/intents` なしは対象外通知で exit 0。壊れた state.json は読み飛ばす。 |
| 権限 | 問題なし | 読み取り専用で、gh CLI とネットワークへ依存しない。 |
| 秘密情報 | 問題なし | 秘密情報や個人情報を扱わない。 |
| 破壊的変更 | なし | ファイルの書き込みを行わない。eval の一時 fixture は成功時も失敗時も片付ける。 |

## CI確認

| 入口 | 結果 | 根拠 |
|---|---|---|
| GitHub Actions（mock）、Cursor Bugbot | 未実行 | PR 未作成のため。PR 作成後に確認し、結果は pr.md と PR 説明から追跡する。 |

## 受け入れ証拠

| 要求 | タスク | 証拠 | 要約 |
|---|---|---|---|
| R001 | B001/T002 | eval の GREEN と実 workspace での検出 | BR001 の判定規則がオフラインで成立する。 |
| R002 | B001/T001, B001/T002 | eval の 5 ケースと昇格先での直接実行 | D002 の入出力契約どおりに動作し、配布先相当で実行できる。 |
| R004 | B001/T001 | RED の記録と eval の pass | 失敗する eval を先行追加し、実装後に GREEN を確認した。 |
