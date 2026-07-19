# Code Generation Plan — election-cli(Bolt 1 核+Bolt 4 完全化)

> 上流入力(consumes 全数): business-logic-model.md、business-rules.md、domain-entities.md、frontend-components.md、performance-design.md、security-design.md、reliability-design.md、logical-components.md、unit-of-work.md、requirements.md、bolt-plan.md

## スコープ分割(bolt-plan.md どおり)

- Bolt 1(walking-skeleton): 7状態機械+next/report+全 verb 最小実装(business-logic-model.md 指令表・frontend-components.md 出力契約 = exit code 正本。Directive の verb/report 機械可読化は #1227 レビュー M1 是正)
- Bolt 4(cli-complete): blind ビュー前置生成(requirements.md FR-1b/1c — security-design.md の型境界)、U4 transport 配線(実送達のみ記帳 — FR-2b)、U3 record 配線(render⇔verify 対称・実 parseGoaLine — reliability-design.md)、hold-resolved 理由別 resume 表(business-logic-model.md の hold 行)、機械実行器 e2e(ADR-6 (i) CI 層 — e2e 層配置は unit-of-work.md U5 行)

## 検証設計

verb 単位の in-process 被覆(t236 — performance-design.md の検証設計)+CLI spawn の e2e(t237/t241)。全ゲート exit code 個別捕捉(business-rules.md の verb 契約と1:1)
