上流入力(consumes 全数): business-logic-model, business-rules, requirements, technology-stack

# Scalability Requirements — kimi-harness-definition

> 上流入力の使用箇所: business-logic-model.md の生成フロー(固定の投影構成)、requirements.md の NFR-3(規模増の将来条件)、technology-stack.md の構成(既存6ハーネスと同型)。

## 判定

**N/A**(存在しない対象)。本 Unit は固定構成の宣言物で、負荷・データ成長・同時実行の概念を持たない。

## 将来条件(requirements.md NFR-3 より)

- ハーネス数の規模増: packager は manifest 自動検出で拡張される構造のため、kimi 追加で既存の生成コストは線形の範囲に留まる(business-logic-model.md の生成フローが既存ハーネスと同じ経路)
- session skills・runner の増加も runner-gen 既定の機構に従う(追加の独自機構なし)
