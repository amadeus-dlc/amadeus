# Scalability Design — u3-boundary-guard

上流入力(consumes 全数 — requirements は宣言5件の consumes_absent fallback 先、business-rules/domain-entities は同 unit FD の随伴成果物): requirements, business-logic-model, business-rules, domain-entities

## 適用範囲の判定

1テストの走査であり スケール設計対象なし(nfr-design:c1)。

## 規模面の設計

検査対象は4面(business-logic-model.md G1)の実ファイル数に比例 — plugin 追加で線形に増えるが、検査は決定的 grep で plugin 数十個規模まで問題にならない(現状 1 plugin・8 変種)。
