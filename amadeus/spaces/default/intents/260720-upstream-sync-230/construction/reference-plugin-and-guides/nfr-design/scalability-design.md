# Scalability Design — reference-plugin-and-guides

> 上流入力(consumes全数): `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`。

## Closed matrix model

本Unitのscalabilityはservice scalingではなく、一つのauthoring sourceを既決配布面へ決定的に投影・検証するmatrixである。sourceはcanonical `plugins/test-pro/`一件、packageはclaude/codex/cursor/kiro/kiro-ide/opencodeの6面、self-installはclaude/codex/cursor/opencodeのclosed 4面、lifecycleは一つのtemp hostに限定する。

## Matrix execution

6 package面と4 self-install面を別の期待集合としてtable-drivenに検査する。面ごとのhardcoded implementationをfixtureへ複製せず、U09のcanonical projectionとU10のcompose/dropを再利用する。harness数が増えても具体slug、文言、pathを互換性軸にしない。

fixture fleet、marketplace catalog、kiro/kiro-ide self-install、agents/scopes/memory/knowledge、`when` evaluatorへ拡張しない。新parallel runner、cache、capacity threshold、auto-scaling ruleは追加しない。

## Capacity verification

| Dimension | Boundary |
|---|---|
| authoring | test-pro一件 |
| package | 6面全数 |
| self-install | closed 4面だけ |
| lifecycle | 一つのtemp hostでclosure |

各matrixの全数成功とnegative対象を独立assertし、一方のgreenを他方へ流用しない。

## トレーサビリティ

本設計は`scalability-requirements.md`のSCALE-U11-01〜04を中心に、`performance-requirements.md`の有界fixture、`security-requirements.md`のsource ownership、`reliability-requirements.md`のdeterminism、`tech-stack-decisions.md`の既存packager/composer、`business-logic-model.md`のSingle E2E lifecycleへ対応する。
