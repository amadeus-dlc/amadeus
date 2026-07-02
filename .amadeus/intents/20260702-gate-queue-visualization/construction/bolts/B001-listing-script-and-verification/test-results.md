# テスト結果

## 検証結果

| 種別 | コマンドまたは確認 | 結果 | 証拠 |
|---|---|---|---|
| 検証（RED） | `GateQueueList.ts` 未実装の状態で `npm run test:it:gate-queue-list` が `Module not found "skills/amadeus-validator/scripts/GateQueueList.ts"` で失敗することを確認 | pass（失敗を確認） | 実行結果（2026-07-02、exit 非 0） |
| 検証（GREEN） | `npm run test:it:gate-queue-list`（承認待ちあり 4 列表、gate と status の併記、非検出、並び順、決定論性、0 件表示、解釈不能 state.json の警告と読み飛ばし、対象外 workspace、入力エラー） | pass | 実行結果（2026-07-02、exit 0） |
| 昇格同期 | `bun run dev-scripts/promote-skill.ts amadeus-validator --replace` と `npm run test:it:promote-skill` | pass | 実行結果（2026-07-02） |
| 実データ確認 | 昇格済み `GateQueueList.ts` を現 workspace と `examples/04-construction-design-ready` に対して実行 | pass | 現 workspace で 3 件（20260702-construction-internal-next-skill-parent-routing の B001〜B003）、examples/04 で 1 件を検出し、exit 0（2026-07-02） |
| 標準検証 | `npm run test:all`（`test:it:gate-queue-list` を連鎖に追加済み） | pass | exit code 0（2026-07-02） |
| 構造検証 | `bun run .agents/skills/amadeus-validator/validator/AmadeusValidator.ts . 20260702-gate-queue-visualization` | pass | 不足または矛盾: なし（2026-07-02） |

## 安全性確認

| 観点 | 結果 | 根拠 |
|---|---|---|
| 入力 | 問題なし | workspace 引数の欠落と不存在は exit 1 で失敗し、JSON として解釈できない `state.json` は stderr へ警告して読み飛ばす。`.amadeus/intents` がない workspace は対象外として exit 0 で終了する。 |
| 権限 | 問題なし | アクセス制御や権限の変更を含まない。 |
| 秘密情報 | 問題なし | 秘密情報や個人情報を扱わない。ネットワークアクセスもない。 |
| 破壊的変更 | 問題なし | スクリプトは読み取り専用であり、`state.json` と Amadeus 成果物を変更しない（INV002）。検証は一時ディレクトリの fixture だけを使う。 |

## CI確認

| 入口 | 結果 | 根拠 |
|---|---|---|
| GitHub Actions（mock）、Cursor Bugbot | 未実行 | PR 未作成のため。PR 作成後に確認し、結果は pr.md と PR 説明から追跡する。 |

## 受け入れ証拠

| 要求 | タスク | 証拠 | 要約 |
|---|---|---|---|
| R001 | B001/T002 | 承認待ちあり、非検出のケース | 判定条件（gate `waiting_approval`、status `waiting_approval`、`taskGeneration.status` の契約写像）が実装され、`not_ready` と `passed` は検出されない。判定語彙は契約カタログから導出し、値を複製していない。 |
| R002 | B001/T002 | 4 列表、待ち理由形式、並び順、決定論性のケース | Intent、phase、ゲート、待ち理由の Markdown 表が 1 回の実行で得られ、同じ入力から同じ出力になる。 |
| R003 | B001/T002 | 0 件表示のケース | 承認待ち 0 件で「承認待ちはありません。」が表示され、exit 0 で実行失敗と区別できる。 |
| R004 | B001/T003 | promote 実行結果と `test:it:promote-skill` の pass、実データ確認 | source と昇格先が同期され、昇格先スクリプトだけで配布先相当の実行ができる。手順の文書記載は B002 で行う。 |
| R005 | B001/T001 | RED の記録と GREEN の pass | 失敗する検証を先行追加し、実装後に GREEN を確認した。 |

## 補足

- 現 workspace への実行で、実在する承認待ち（20260702-construction-internal-next-skill-parent-routing の Task Generation Gate 3 件）を検出した。承認待ちの見落とし防止という Intent の目的に対する実地確認になっている。
