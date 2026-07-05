# Business Rules — space-inventory

上流入力: [requirements.md](../../../inception/requirements-analysis/requirements.md)

## ルール

| ID | ルール | 出典 |
|---|---|---|
| BR-1 | 上流適応ファイル（.agents/rules/amadeus.md 等）は編集しない | parity rules-file 検査（実測 fail） |
| BR-2 | codekb は全面再解析せず、明確な廃止機構の記述だけを補正し timestamp に履歴を残す | R005 |
| BR-3 | 廃止参照（intents.md、IndexGenerate.ts）を修正後の文書に残さない | AC2 |
