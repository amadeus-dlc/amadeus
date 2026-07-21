# Security Design — plugin-composition

> 上流入力(consumes全数): `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`。

## Trust・ownership境界

projected plugin descriptorとhost snapshotはuntrusted inputとしてinspectする。same-name、malformed、unknown seam、clobberを全数検査し、一件でもあればhost、composition record、auditの三面を変更しない。`diagnosePlugins`はread-only projectionに限定し、failureを成功advisoryへ丸めない。

shared file全体をplugin所有としない。PluginRecordはcompose時base/precondition、plugin自身のcanonical contribution、決定的適用順、期待post-stateだけを記録する。compose/dropは全current一致を最初のmutation前に検証し、user edit、unknown drift、contribution identity不一致を推測修復せず三面不変で拒否する。

## Transaction integrity

workspace lock下でhost/record/audit三面の全write-setとpreimageをdurable WALへ固定し、最初のcanonical mutation前にPREPAREDをdurable化する。三面完了後だけCOMMITTEDへ進め、record/auditは一度だけ成立させる。

handled failureはreturn前にpreimageへ即時・冪等復元する。未完了PREPARED後のcrashは次操作前に同じlock下でpre-stateへ回復する。durable COMMITTED後はpost-state、record、audit onceを維持し、pre-stateへ戻さない。journal/preimage driftまたはcorruptionは追加mutation 0でloud停止する。

## Supply-chain controls

plugin sourceのdeferred面や任意codeを実行しない。新credential、network、database、service、UI、marketplace、別lock/journal store、audit event、retentionを追加しない。

## トレーサビリティ

本設計は`security-requirements.md`のSEC-U10-01〜05を中心に、`performance-requirements.md`の全error収集、`scalability-requirements.md`のwrite-set固定、`reliability-requirements.md`のphase別recovery、`tech-stack-decisions.md`の既存workspace transaction、`business-logic-model.md`のShared-file ownershipへ対応する。
