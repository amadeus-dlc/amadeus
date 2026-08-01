# Scalability Design — u6-impl-only-path

上流入力(consumes 全数 — requirements は宣言5件の consumes_absent fallback 先、business-rules/domain-entities は同 unit FD の随伴成果物): requirements, business-logic-model, business-rules, domain-entities

## 適用範囲の判定

CLI verb でありスケール設計対象なし(nfr-design:c1)。

## 規模面の設計

entries 数は model-map の登録実装ファイル数(domain-entities.md E2 — sha256 のみ更新で implPath 集合は不変。現状 5、u7 の v2 化後も1モデルあたり数ファイル)— hash 再計算は線形で数十エントリまで自明に収まる。
