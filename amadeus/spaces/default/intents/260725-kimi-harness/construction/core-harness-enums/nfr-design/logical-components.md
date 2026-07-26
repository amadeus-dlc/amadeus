上流入力(consumes 全数): performance-requirements, security-requirements, scalability-requirements, reliability-requirements, tech-stack-decisions, business-logic-model

# Logical Components — core-harness-enums

> 上流入力の使用箇所: tech-stack-decisions.md §選択(同形追加・named constant・subagent floor)を構造の根拠とする。

## 対象の概要

本 Unit の論理構成は「検出定数の拡張 + doctor arm + swarm 列挙」の3点。

## 構成

| 論理部品 | 役割 | 対応する実体 |
|---|---|---|
| 検出定数 | `.kimi-code` の検出・型・rules 解決 | `amadeus-harness.ts` の4定数への同形追加 |
| doctor arm | kimi 版の4チェック + otherTrees | U4 の設計(FD の doctor arm フロー)が定める実装場所(`amadeus-utility.ts` の handleDoctor 内) |
| swarm 列挙 | `resolve --harness kimi` の受理 | `amadeus-swarm.ts` の `HARNESS_VALUES` |

## 関係

- 検出定数は doctor arm 実行の前提(`.kimi-code` が検出されて初めて arm が対象化される)。swarm の resolve は検出を契約上のゲートとせず、検出は通常フローで `--harness kimi` の値を供給する導線(FD §swarm resolve の契約どおり)
- 編集は全て同形の追加で、既存ロジックの分岐を変更しない(tech-stack-decisions.md §選択の編集形どおり)
