# Scalability Design — unit-iteration-and-scope-preview

> 上流入力(consumes全数): `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`。

## Matrix capacity model

本Unitのscalabilityはservice scalingではなく、Unit×compiled stage matrixとscope gridに対する順序保存である。`unit-major`では既存Unit列を外側、compiled stage列を内側として最初の実行可能stepまで走査する。規模増加時も別sort、名前順tie-break、priority queueへ切り替えない。

iteration未指定時は既存stage-major resolverだけを使用し、stage-majorとunit-majorの両matrixを同時に構築しない。Unit kind/schemaはU01、batch/next-stageはU03のownerに残す。

## Scope preview capacity

一つのCompiledGridからeffective in-scope集合を導出し、その集合のstage数とgate数をScopeSummaryへ保持する。4 consumerはsummary consumerであってcount ownerではない。consumer別index/count、precomputed第二grid、横断cacheを持たせない。

| Dimension | Boundary |
|---|---|
| unit-major | Unit外側・compiled stage内側の一方向走査 |
| default | 既存stage-major resolverのみ |
| preview | 一つのeffective in-scope集合 |
| consumer | 同一ScopeSummaryの4 projection |

## Capacity verification

2 Unit×複数stage、全scope、gate 0/複数、4 consumerをtable-driven fixtureで検証する。Unit/stage/scope数が増えてもselection orderとcount semanticsが変わらないことを固定し、新capacity threshold、scheduler、auto-scaling ruleは追加しない。

## トレーサビリティ

本設計は`scalability-requirements.md`のSCALE-U05-01〜04を中心に、`performance-requirements.md`の有界決定、`security-requirements.md`のcount integrity、`reliability-requirements.md`のconsumer parity、`tech-stack-decisions.md`の既存graph/grid、`business-logic-model.md`のIteration/Preview workflowへ対応する。
