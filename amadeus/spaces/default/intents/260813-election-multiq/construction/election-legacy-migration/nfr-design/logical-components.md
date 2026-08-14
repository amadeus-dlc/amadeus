# Logical Components — election-legacy-migration

## Input

[business-logic-model](../functional-design/business-logic-model.md)を5 componentsへ分ける。

## Components

Planner、Precondition Guard、Mover、Registry Updater、Fidelity Verifier。Planner/Verifierはread-only、Mover/Updaterはreceipt lock下で実行する。

## Blast radius and review

一operationはone election directory/registry rowだけ。READY: failureをcomponent stepとしてreceiptに残し、scope外pathへ波及しない。
