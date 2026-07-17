# Scalability Requirements — answer-evidence-sensor

上流入力(consumes 全数): unit FD 4点(`../functional-design/business-logic-model.md`・`business-rules.md`・`domain-entities.md`・`frontend-components.md`)、`../../../inception/requirements-analysis/requirements.md`(FR-1〜7)、codekb `technology-stack.md`(Bun/TS/Biome 前提)。

## 要件

- SC-1: corpus sweep(AC-4b)は repo 全 questions ファイル(現 130+ — #1106 sweep 実測時点、測定 ref: 当時 HEAD)を単一プロセスで走査できること — sweep はテスト時のみで運用経路は単一ファイル検査。
- SC-2: 将来の stage 増加は sensors: 宣言の1行追加のみでスケール(ADR-2 Consequences)。

## 検証

sweep テスト(C-5)自体が SC-1 の実証を兼ねる。専用スケールテストなし(比例選定)。
