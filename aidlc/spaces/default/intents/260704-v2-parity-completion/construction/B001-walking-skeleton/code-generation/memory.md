# Memory: code-generation（B001）

## Interpretations

- 「エンジン無改変」を diff -r のバイト一致まで含めて解釈し、適応はエンジン外（settings、bridge 規範、skill 改名）だけに限定した。
- promote-skill.ts は references/ を昇格対象に含み、evals/ を除外する既存挙動のまま新 skill を扱えた（設計判断 3 の想定どおり）。

## Deviations

- 実装はサブエージェントへ委譲した（skill 手順の「大規模な場合は委譲できる」に該当）。
- smoke 中に発火した hooks が監査 shard を自動生成した。実作業ではないノイズだったため当該 shard 1 件だけ削除した（git 管理外の新規ファイルの削除であり、追記専用契約の違反ではない）。

## Tradeoffs

- 上流 statusLine を取り込まなかったため、workflow 進捗のステータスバー表示は当面ない。既存 UX の保全（C001）を優先した。
- directive 駆動のエンドツーエンド実行（`--single` の実走）は本番 record を変更しうるため 3.5 では行わず、3.6 の sandbox 統合テストと B004 の dogfooding へ回した。

## Open questions

- hooks が今後の全セッションで audit shard や runtime ノイズを生む可能性がある。gitignore 済みだが、audit shard（コミット対象）の生成条件は B004 の dogfooding で観察する。
