# NFR Requirements Questions — plugin-composition

> 上流入力(consumes 全数): `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`。
>
> 対象: U10 `plugin-composition`。BR-U10-01〜22、FR-6 item 20、E-USSU10FD1/2、Requirements NFR-1〜8をNFRへ機械導出する。
>
> E-OC1 判定: **質問0問**。leader承認 `2026-07-20T23:43:46Z`。

## 質問不要の根拠

- Performance/scalability: inspect→plan→temp apply→verify→commit/dropはinvocation-localかつ決定順であり、新SLO、parallelism、cache、batch policyを決める余地はない。
- Security/integrity: same-name、malformed、unknown seam、clobberは全数検査し、一件でもあればwrite 0とする。shared fileはplugin contributionだけを所有し、current/precondition/post-state不一致を全mutation前にloud rejectすることが既決である。
- Reliability/atomicity: workspace lock下のdurable write-ahead journalへ全三面write-set/preimageを記録し、最初のmutation前に`PREPARED`、全三面完了後だけ`COMMITTED`、handled failure即時復元、未完了`PREPARED`のcrashは次操作前にpre-state回復、durable `COMMITTED`後はpost-state維持、未回復中の新規操作禁止、drift/corruption時の追加mutation 0がE-USSU10FD2で閉じている。
- Ownership/drop: `PluginRecord`はbase/precondition、canonical contribution、適用順、期待post-stateを保持し、dropは対象寄与を除いた残存寄与を決定的再構築する。shared file全体所有は禁止されている。
- Technology: Bun/TypeScript、既存C1/C2/C4、filesystem、workspace lock/audit/test stackを維持し、新runtime dependency、service、database、network、UIを追加しない。

新signature、error precedence、ownership、failure/recovery、atomicity、journal format、retry/retentionを選ぶ余地はない。成果物化中に新たなfailure分類、recovery分岐、atomicity、drop ownership判断が必要になった場合は確定前に停止し、再付議する。

## [Answer]

[Answer]: 質問0問で可。E-OC1でleader承認済み（`2026-07-20T23:43:46Z`）。承認範囲はBR-U10-01〜22、FR-6 item 20、Requirements NFR-1〜8、正準6 public seamと内部`discoverPlugins`、E-USSU10FD1のshared contribution ownership、E-USSU10FD2のdurable WAL/PREPARED/COMMITTED/三面write-set・preimage/回復境界、Bun/TypeScriptと既存C1/C2/C4 stackの機械導出に限定する。新failure分類、recovery分岐、journal format、retry、atomicity、drop ownership、public API、dependency、service、database、network、UI、保持期間、SLOは追加しない。
