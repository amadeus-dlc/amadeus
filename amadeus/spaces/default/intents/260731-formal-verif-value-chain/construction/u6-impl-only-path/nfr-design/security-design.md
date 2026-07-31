# Security Design — u6-impl-only-path

上流入力(consumes 全数 — requirements は宣言5件の consumes_absent fallback 先、business-rules/domain-entities は同 unit FD の随伴成果物): requirements, business-logic-model, business-rules, domain-entities

## 信頼境界

- 更新は宣言フラグ(--impl-only)経由のみ(business-rules.md BR-U6-2 — 手編集の正規化廃止)。宣言なし更新は構造的に不能。
- model/cfg が変わっていれば必ず拒否(business-logic-model.md I1 — モデル意味論変更の偽装を fail-closed 遮断)。
- 監査記録は stdout+git の2層(P2、domain-entities.md E3)— 改竄は git 履歴が保存し、amadeus 監査シャードへの依存を持ち込まない(intent 非依存ツールの独立性)。

## 検証劇場の回避

成功コードは実 publish の戻りから導出(P5/I4 — status ハードコード禁止)。
