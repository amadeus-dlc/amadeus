# Security Design — u3-boundary-guard

上流入力(consumes 全数 — requirements は宣言5件の consumes_absent fallback 先、business-rules/domain-entities は同 unit FD の随伴成果物): requirements, business-logic-model, business-rules, domain-entities

## 本 unit 自体がセキュリティ面の強化

境界ガード(G2 — repo-only パス参照の検出)は配布物の完全性検査であり、供給網の観点で「配布先で実行不能・意図しない repo 依存」を機械遮断する(requirements FR-A6 の趣旨)。

## fail-closed 契約

- 違反検出は loud な列挙+exit 非0(business-logic-model.md G3)。
- 許容リストは初期空・追加には理由必須(domain-entities.md E3 — fail-closed 既定、business-rules.md BR-U3-3)。
