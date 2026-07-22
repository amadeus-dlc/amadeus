# Scalability Design — harness-hook-correctness

> 入力: `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`。runtime horizontal scalingではなく、harness/command projection数の決定的全数処理を設計する。

## Projection matrix

| Axis | Closed set | Design |
|---|---|---|
| package harness | claude、codex、cursor、kiro、kiro-ide、opencode | 既存manifest-driven generatorでsourceから全6面を導出 |
| self-install | claude、codex、cursor、opencode | 既存closed list 4面だけをpromote/check |
| Claude hook command | 承認済み11件 | authored settingsをparseし、件数・順序・引用・path実在を全数検査 |
| spawn site | inventoryで実在確認したsite | bare runtimeを構造検査し、非実在siteへdormant seamを作らない |

matrixの正本は既存manifest、authored settings、実在adapter sourceである。consumer別hardcoded list、dynamic discovery service、parallel projection、別indexを追加しない。

## Deterministic expansion

同一source/manifestから同一6面bytesを得る。harness追加は既存manifest/generator境界でのみ扱い、U07がprojection scopeを増やさない。Claude command追加も本Unitでは行わず、既決11件の変換だけを対象とする。

Kiro IDE payload数やhook invocation数はinvocation-localで独立し、shared mutable cacheやqueueを持たない。負荷増加に備えたautoscaling、partition、load balancer、AWS infrastructureは要求根拠がないため設計しない。

## Capacity fixture

6 harness×該当spawn site、11 Claude commands、4 self-install面をtable-driven fixtureで全数列挙する。欠落、重複、順序drift、orphan projection、statusline/permission差分を非0にし、代表サンプルだけで合格にしない。

## トレーサビリティ

本設計は`scalability-requirements.md`のclosed matrix、`performance-requirements.md`の有界走査、`security-requirements.md`のscope固定、`reliability-requirements.md`のprojection drift、`tech-stack-decisions.md`のpackage/promote境界、`business-logic-model.md`のFlow A/Cへ対応する。
