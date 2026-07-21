# Security Requirements — plugin-composition

> 根拠: `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`。untrusted plugin descriptorとworkspace driftを検証し、host/record/auditの無承認変更を防ぐ。

## Integrity controls

| ID | 脅威 | control | 合格条件 |
|---|---|---|---|
| SEC-U10-01 | same-name/malformed/unknown seam/clobber | 全errorを収集し、一件でもあればplan/writeへ進まない。 | host/record/audit mutation 0。 |
| SEC-U10-02 | shared file全体の誤所有 | recordはbase/precondition、plugin contribution、適用順、期待post-stateだけを保持する。 | whole-file ownership 0。 |
| SEC-U10-03 | user edit/unknown driftの上書き | 全current一致を最初のmutation前に検証し、不一致は三面不変でloud rejectする。 | 推測復元・silent clobber 0。 |
| SEC-U10-04 | partial commit/crash | lock下で全三面write-set/preimageをjournalへ記録し、mutation前`PREPARED`、全三面後`COMMITTED`とする。 | 未完了`PREPARED`へのfailure injection後にpre-stateへ収束し、durable `COMMITTED`後はpost-stateを維持。 |
| SEC-U10-05 | corrupt recovery継続 | journal/preimage driftまたはcorruption時は追加mutationなしでloud停止する。 | dirty-state continuation 0。 |

`diagnosePlugins`はread-onlyでfailureを成功advisoryへ丸めない。新error precedence、failure分類、recovery分岐、journal formatを追加しない。

## Supply chain・compliance

plugin sourceは検査対象として扱い、deferred面や任意コードを実行しない。新runtime dependency、service、database、network、UI、credential、audit event、retentionを追加せず、既存license/human gate/audit境界を維持する。

## トレーサビリティ

SEC-U10-01〜05は`business-rules.md`のBR-U10-01〜22、`business-logic-model.md`のFailure table、`requirements.md`のNFR-2/4/8、`technology-stack.md`に対応する。
