# Unit Story Map — 260720-goa-sparse-family

上流入力(consumes 全数): requirements.md、components.md、component-methods.md、services.md、component-dependency.md、decisions.md

| ジャーニー | U1 の対応 |
|---|---|
| §13 persist 文の書き手(人間) | スパース手書き行がそのまま将来集計で読める(FR-1) |
| 選挙 CLI 利用者 | 複節 election id が自然形で record に残る(FR-2) |
| 週次蒸留の将来実装者 | component-methods.md の extractGoaRecords+segments(decisions.md ADR-1/4)で corpus 全域を機械消費可能・ECODE count 信頼(FR-3) |
| レビュアー/CI | services.md の出力契約4点(corpus sweep 両側・count 不変対照ほか)が requirements.md FR-4 の回帰ゲート化(components.md のテスト面)。実装順序は component-dependency.md 準拠 |
