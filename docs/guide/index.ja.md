# Amadeus DLC User Guide（Amadeus DLC 利用者ガイド）

## この文書について

この文書は、自分の workspace に Amadeus DLC を導入し運用する人向けである。
Amadeus 自体を開発する人向けではなく、自分のプロジェクトでライフサイクルを動かす人を対象にする。
すでに Amadeus を導入済みで、ステアリングや拡張が必要な場合は、代わりに[拡張ガイド](../amadeus/extension-guide.ja.md)を参照する。

章の切り方（番号付き章、introduction、getting-started、first-workflow の順）は、上流 AI-DLC v2 ガイドの目次を構成の参考にしただけである。
本ガイドの執筆にあたり、上流の各章本文は開いていない。
本文はすべて Amadeus 自身の実体（各 skill、`.agents/amadeus/` エンジン、installer、本リポジトリに実在するコマンドと path）から書き起こす。

本ガイドは `docs/amadeus/` と同じ言語規約に従う。
各章は英語 `<name>.md`（正本）と、日本語 `<name>.ja.md`（訳文）の対で公開する。
規約の詳細は [Language Policy](../amadeus/language-policy.ja.md) を参照する。

## 読む順序

導入の一連（3 章）は番号順に読む。

1. [00 — Introduction](00-introduction.ja.md)：Amadeus DLC とは何か、どう動くか、AI-DLC v2 とどう関係するかを扱う。
2. [01 — Getting Started](01-getting-started.ja.md)：workspace へのエンジン導入と、導入後の検証を扱う。
3. [02 — Your First Workflow](02-first-workflow.ja.md)：birth、最初のエンジン directive、状態と成果物の置き場所を扱う。

## 章一覧

| # | 章 | 状態 |
|---|---|---|
| 00 | [Introduction](00-introduction.ja.md) | 執筆済み |
| 01 | [Getting Started](01-getting-started.ja.md) | 執筆済み |
| 02 | [Your First Workflow](02-first-workflow.ja.md) | 執筆済み |
| 06 | [Agents](06-agents.ja.md) | 執筆済み |
| 07 | [Interaction Modes](07-interaction-modes.ja.md) | 執筆済み |
| 12 | [CLI Commands](12-cli-commands.ja.md) | 執筆済み |

以下はまだ執筆していない章である。
それぞれ [#533](https://github.com/amadeus-dlc/amadeus/issues/533) の子 Issue が対応を追跡する。
いずれも未執筆であり、章番号とタイトルは子 Issue 着手時に確定する仮のものである。

| # | タイトル案 | 対応する子 Issue | 状態 |
|---|---|---|---|
| 03 | Spaces and Intents | [#567](https://github.com/amadeus-dlc/amadeus/issues/567) | 未執筆 |
| 04 | Phases and Stages | [#567](https://github.com/amadeus-dlc/amadeus/issues/567) | 未執筆 |
| 05 | Scopes and Depth | [#567](https://github.com/amadeus-dlc/amadeus/issues/567) | 未執筆 |
| 08 | Knowledge | [#569](https://github.com/amadeus-dlc/amadeus/issues/569) | 未執筆 |
| 09 | Rules and the Learning Loop | [#569](https://github.com/amadeus-dlc/amadeus/issues/569) | 未執筆 |
| 10 | State and Audit | [#569](https://github.com/amadeus-dlc/amadeus/issues/569) | 未執筆 |
| 11 | Session Management | [#570](https://github.com/amadeus-dlc/amadeus/issues/570) | 未執筆 |
| 13 | Customization | [#570](https://github.com/amadeus-dlc/amadeus/issues/570) | 未執筆 |
| 14 | Artifacts Reference | [#570](https://github.com/amadeus-dlc/amadeus/issues/570) | 未執筆 |
| 15 | Troubleshooting | [#570](https://github.com/amadeus-dlc/amadeus/issues/570) | 未執筆 |
| 16 | Worked Examples | [#571](https://github.com/amadeus-dlc/amadeus/issues/571) | 未執筆 |
| 17 | Skills | [#571](https://github.com/amadeus-dlc/amadeus/issues/571) | 未執筆 |
| — | Amadeus 独自章（多体連携運用、docs-only 宣言、`pdm` scope、validator、grilling プロトコル）、glossary、harness 別ガイド | [#571](https://github.com/amadeus-dlc/amadeus/issues/571) | 未執筆 |

## 関連リンク

- [README](../../README.ja.md)：プロジェクト概要と導入クイックスタート。
- [AMADEUS.md](../../AMADEUS.md)：本リポジトリでエージェントが読み込む共通入口の文書。
- [拡張ガイド](../amadeus/extension-guide.ja.md)：導入済み workspace をステアリングするために編集する対象。
- [Lifecycle Contract Overview](../amadeus/lifecycle/overview.ja.md)：phase、stage、gate の契約の正。
