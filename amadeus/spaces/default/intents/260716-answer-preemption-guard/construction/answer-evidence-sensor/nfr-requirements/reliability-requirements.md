# Reliability Requirements — answer-evidence-sensor

上流入力(consumes 全数): unit FD 4点(`../functional-design/business-logic-model.md`・`business-rules.md`・`domain-entities.md`・`frontend-components.md`)、`../../../inception/requirements-analysis/requirements.md`(FR-1〜7)、codekb `technology-stack.md`(Bun/TS/Biome 前提)。

## 要件

- R-1: advisory 契約 — sensor の異常(script クラッシュ含む)がワークフロー進行を止めないこと(dispatcher の既存真理値表が SCRIPT_ERROR を扱う — scan-notes (c) :520 decideOutcome)。
- R-2: fail-closed 層(gate-start)は本 Unit の障害と独立に機能する(二層の独立性 — services.md)。
- R-3: 検査は決定的 — 同一入力で同一 JSON(時刻・乱数非依存)。

## 検証

R-3 は C-5 テストで同一 fixture 2回実行の出力一致をピン。R-1 は既存 dispatcher テストの守備範囲(無改修)。
