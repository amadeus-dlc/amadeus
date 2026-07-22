# NFR Design Questions — plugin-composition

> 上流入力(consumes 全数): `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`。
>
> 対象: engine順10/12 / 正本Unit U10 `plugin-composition`。承認済みNFR、正準6 public seam、既決ownership・三面transaction境界を既存C1/C2/C4へ機械配置する。
>
> E-OC1 判定: **質問0問**。E-USSU16ND1 recorded裁定 `2026-07-21T03:50:01Z`。

## 質問不要案の根拠

- Seam: publicは`inspectPlugin`、`planPluginComposition`、`applyPluginPlan`、`planPluginDrop`、`applyPluginDrop`、`diagnosePlugins`の6関数だけで、`discoverPlugins`は内部helperである。
- Inspect: same-name、malformed、unknown seam、clobberを決定順で全数検査し、一件でもあればplan/writeへ進まない。
- Ownership: PluginRecordはbase/precondition、canonical contribution、適用順、期待post-stateだけを保持し、shared file全体を所有しない。dropは残存寄与から決定的再構築する。
- Transaction: workspace lock下のdurable WALへhost/record/audit三面の全write-set/preimageを記録し、mutation前PREPARED、三面完了後だけCOMMITTEDとする。
- Recovery: handled failureと未完了PREPARED crashはpre-stateへ冪等回復し、durable COMMITTED後はpost-state・record・audit onceを維持する。drift/corruption時は追加mutation 0で停止する。
- Verification: composeはtemp compile/sensor、dropはtemp compile/doctor成功後だけcanonical commitする。

新signature、error precedence、ownership、failure/recovery分類、journal format、atomicity、retry/retention、dependency、service、SLOを選ぶ余地はない。新判断は確定前にleaderへ再付議する。

## [Answer]

[Answer]: 質問0問で可（推奨）— 既決契約から機械導出できる。E-USSU16ND1はchoice 1を3票、choice 2/3を0票、GoA 1を3票で裁定した（開票 `2026-07-21T03:50:01Z`）。承認範囲は正準6 public seamと内部discover、全error収集、shared contribution ownership、三面WAL（PREPARED→COMMITTED）、未完了PREPAREDのpre-state回復、durable COMMITTEDのpost-state維持、drift/corruption時mutation 0を既決契約から機械導出する範囲に限定する。新signature、error、ownership、recovery、journal、atomicity、policy、dependency、service、SLOは追加しない。
