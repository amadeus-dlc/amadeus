# Security Requirements — lifecycle-transaction

`business-logic-model`、`business-rules`、`requirements`、`technology-stack`からhuman-presence、journal、auditのtrust boundaryを定義する。

## Controls

- archive/unarchiveは実HUMAN_TURNを必須とし、同一shard timestamp重複を開始前に拒否する。
- journal schema、FFF/TFF/TTF/TTT topology、verb/from/to、operationId、予約turnをstrict検証する。
- 既存audit eventは保存先shardと全immutable payloadがjournalに完全一致するときだけ冪等success。
- corrupt/unknown/inconsistent journalを自動削除・再生成せずfail-closed。
- context tokenはcallback中だけ有効で、別workspace・失効後利用を拒否する。

## Data protection

userInputは監査要件のため保存するが、外部送信しない。diagnosticへaudit全体やuserInput全文を複製しない。対象はlocal same-user workspaceであり、OS権限を奪取したactorは対象外。
