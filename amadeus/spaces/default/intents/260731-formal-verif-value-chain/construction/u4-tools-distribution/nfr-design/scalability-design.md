# Scalability Design — u4-tools-distribution

上流入力(consumes 全数 — requirements は宣言5件の consumes_absent fallback 先、business-rules/domain-entities は同 unit FD の随伴成果物): requirements, business-logic-model, business-rules, domain-entities

## 適用範囲の判定

CLI verb でありスケール設計対象なし(nfr-design:c1)。

## 規模面の設計

- tools 配布規模は manifest 宣言数に比例(現状 24+複製1)— compose の既存 I/O パターン内。
- 一括 compose はツリー数(高々 7)× 単一 compose の直列 — fail-closed 集計で部分失敗を loud 列挙(M4)。ツリー数は KNOWN_HARNESS_DIRS 上限で有界。
