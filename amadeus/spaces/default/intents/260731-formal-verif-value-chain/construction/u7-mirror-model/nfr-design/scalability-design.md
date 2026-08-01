# Scalability Design — u7-mirror-model

上流入力(consumes 全数 — requirements は宣言5件の consumes_absent fallback 先、business-rules/domain-entities は同 unit FD の随伴成果物): requirements, business-logic-model, business-rules, domain-entities

## 適用範囲の判定

モデル検証は CI の単発ジョブでありスケール設計対象なし(nfr-design:c1)。

## 規模面の設計

- 状態空間: ADR-3 の縮約定数(MaxReceipts=3)が上限を定める — receipt 状態 7 × effect 3 × 遷移 14 の直積が支配項(business-logic-model.md T1/T2)。完走不能時の対処は縮約の追加+消える性質の明記(性能予算と同じ規律)。
- model-map v2 の models[] は線形成長(現状2モデル)— 検証は per-model 直列で問題にならない。
