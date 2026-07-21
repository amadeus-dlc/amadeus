# Security Requirements — unit-iteration-and-scope-preview

> 根拠: `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`。validated state/StageGraph/CompiledGridだけをdecision inputとし、不正iterationやprojector driftによる不正mutationを防ぐ。

## Integrity controls

| ID | 脅威 | control | 合格条件 |
|---|---|---|---|
| SEC-U05-01 | 不正iterationによるpartial mutation | state、plan、graph、auditの最初のmutation前に拒否する。 | 全4面のpre/post bytes一致。 |
| SEC-U05-02 | implicit mode activation | `unit-major`は明示state verbだけでopt-inする。 | 未指定時にunit-major選択0。 |
| SEC-U05-03 | scope countの捏造・drift | 正本`CompiledGrid`の同一effective in-scope集合からstage数・gate数を導出する。 | hardcoded/consumer別count 0。 |
| SEC-U05-04 | projector間の値差し替え | 4 consumerのhuman表示とJSON summaryは同じ`ScopeSummary` valueを使う。 | projector間count差分0。 |

invalid iterationの新分類、error文言、exit policyを本Unitで作らず、既存validation/CLI境界を維持する。2 seamはlock/state/audit writeを所有しない。

## Supply chain・compliance

新runtime dependency、service、database、network、UI、credential、audit event、retentionを追加しない。既存human gate、audit、license境界とBun/TypeScript stackを維持する。

## トレーサビリティ

SEC-U05-01〜04は`business-rules.md`のBR-U05-01〜15、`business-logic-model.md`のCompatibility/Integration boundaries、`requirements.md`のNFR-2/3/8、`technology-stack.md`に対応する。
