# テスト結果

## 検証結果

| 種別 | コマンドまたは確認 | 結果 | 証拠 |
|---|---|---|---|
| 手順記載 | `skills/amadeus-validator/SKILL.md` の `## 同梱スクリプト` に `GateQueueList.ts` の用途、コマンド、0 件時表示、exit code 契約、対象外の扱いを追記 | pass | SKILL.md の差分（2026-07-02） |
| 昇格同期 | `bun run dev-scripts/promote-skill.ts amadeus-validator --replace` と `npm run test:it:promote-skill` | pass | 実行結果（2026-07-02、promote: ok、eval: ok） |
| 標準検証 | `npm run test:all` | pass | exit code 0（2026-07-02） |

## 安全性確認

| 観点 | 結果 | 根拠 |
|---|---|---|
| 入力 | 問題なし | 文書変更と promote 同期だけであり、新しい入力面を追加しない。 |
| 権限 | 問題なし | アクセス制御や権限の変更を含まない。 |
| 秘密情報 | 問題なし | 秘密情報や個人情報を扱わない。 |
| 破壊的変更 | 問題なし | SKILL.md への追記と昇格先の同期に限定され、既存の記載と契約を変更しない。`npm run test:all` で非破壊を確認した。 |

## CI確認

| 入口 | 結果 | 根拠 |
|---|---|---|
| GitHub Actions（mock）、Cursor Bugbot | 未実行 | PR 未作成のため。PR 作成後に確認し、結果は pr.md と PR 説明から追跡する。 |

## 受け入れ証拠

| 要求 | タスク | 証拠 | 要約 |
|---|---|---|---|
| R004 | B002/T001, B002/T002 | SKILL.md の記載、promote 実行結果、`test:it:promote-skill` の pass | 一覧の実行手順が利用者向け文書（`## 同梱スクリプト`）から読め、source と昇格先が同期されている。 |
