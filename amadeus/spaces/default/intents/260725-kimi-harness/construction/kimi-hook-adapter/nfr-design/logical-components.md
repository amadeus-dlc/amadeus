上流入力(consumes 全数): performance-requirements, security-requirements, scalability-requirements, reliability-requirements, tech-stack-decisions, business-logic-model

# Logical Components — kimi-hook-adapter

> 上流入力の使用箇所: tech-stack-decisions.md §選択(shim+lib 分割)と business-logic-model.md §dispatch フローを構造の根拠とする。

## 対象の概要

本 Unit の論理構成は「shim(入出力) → lib(変換) → core hooks(既存)」の3層。

## 構成

| 論理部品 | 役割 | 対応する実体 |
|---|---|---|
| shim | stdin 読取・target 分岐・subprocess 起動・exit/stdout 中継 | `amadeus-kimi-adapter.ts` |
| lib | 変換表・正規化・出力翻訳(テスト対象) | `amadeus-kimi-lib.ts` |
| core hooks | 既存の11 hook(非改変) | `.kimi-code/hooks/amadeus-*.ts` |
| fixtures | live capture の実機 payload | `tests/fixtures/kimi-hooks/` |

## 関係

- shim は lib のみに依存し、core hook の知識を持たない。lib は core hook への入力契約(Claude 型)のみを知る(tech-stack-decisions.md §選択の分割意図: lib を in-process テスト可能に)
- core hooks は kimi を知らない(byte-shared 維持 — tech-stack-decisions.md §却下)
