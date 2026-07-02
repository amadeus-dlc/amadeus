# テスト結果

## 検証結果

| 種別 | コマンドまたは確認 | 結果 | 証拠 |
|---|---|---|---|
| eval（RED） | スクリプト未実装の状態で `npm run test:it:state-scaffold` が `Module not found ... StateScaffold.ts` で失敗することを確認 | pass（失敗を確認） | 実行結果（2026-07-02） |
| eval（GREEN） | `npm run test:it:state-scaffold`（7 遷移の生成 × 遷移直後の validator pass、冪等性、既存値保持、evidence の実在、不正入力の失敗） | pass | 実行結果（2026-07-02） |
| 標準検証 | `npm run test:all`（`test:it:state-scaffold` を `test:it:all` の連鎖に追加済み） | pass | exit code 0（2026-07-02） |
| 昇格同期 | `bun run dev-scripts/promote-skill.ts amadeus-validator --replace` と `npm run test:it:promote-skill`、source と昇格先の md5 一致 | pass | 実行結果（2026-07-02） |
| 配布先相当 | eval は昇格先（`.agents/skills/amadeus-validator/scripts/StateScaffold.ts`）を直接実行し、repo root の開発用スクリプトを参照しない | pass | eval の実装 |

## 安全性確認

| 観点 | 結果 | 根拠 |
|---|---|---|
| 入力 | 問題なし | スクリプトは workspace 内の `state.json` の読み書きだけを行い、不正な遷移種別と不足引数では利用可能な値を示して失敗する。 |
| 権限 | 問題なし | アクセス制御や権限の変更を含まない。 |
| 秘密情報 | 問題なし | 秘密情報や個人情報を扱わない。 |
| 破壊的変更 | 問題なし | 既存の値と他 phase のブロックを保持し、進行済みの state を intent-capture で上書きしない guard を持つ。eval は一時ディレクトリだけを使い、成功時も失敗時も片付ける。 |

## CI確認

| 入口 | 結果 | 根拠 |
|---|---|---|
| GitHub Actions（mock）、Cursor Bugbot | 未実行 | PR 未作成のため。PR 作成後に確認し、結果は pr.md と PR 説明から追跡する。 |

## 受け入れ証拠

| 要求 | タスク | 証拠 | 要約 |
|---|---|---|---|
| R001 | B001/T002 | eval の GREEN（7 遷移 × 遷移直後の validator pass） | 各遷移直後に state.json 起因の構造 fail が出ないことを固定入力で確認した。 |
| R002 | B001/T002 | eval の冪等性と既存値保持のケース | 再実行で結果が変わらず、ideation ブロックと evidence が保持されることを確認した。 |
| R003 | B001/T002, B001/T003 | 昇格先での実行と生成済み契約の import | スクリプトは `validator/generated/**` を参照し、昇格先から単独で実行できる。 |
| R005 | B001/T001 | RED の記録と eval の pass | 失敗する eval を先行追加し、実装後に GREEN を確認した。 |
| R006 | B001/T003 | promote 実行結果と md5 一致 | source と昇格先が同期された。 |

## 補足

実装中の発見として、現行 validator は construction phase に「Bolt 準備済みの Bolt が 1 件以上」を要求するため、`construction-start` と `functional-design` の直後の状態は単独では validator を通せない。検証チェックポイントは最初の `bolt-preparation` 完了後とし、スクリプトの usage、skill の案内、eval に明記した（詳細: notes.md）。
