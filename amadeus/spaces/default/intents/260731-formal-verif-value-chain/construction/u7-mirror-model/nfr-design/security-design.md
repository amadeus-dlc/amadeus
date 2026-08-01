# Security Design — u7-mirror-model

上流入力(consumes 全数 — requirements は宣言5件の consumes_absent fallback 先、business-rules/domain-entities は同 unit FD の随伴成果物): requirements, business-logic-model, business-rules, domain-entities

## 信頼境界

- model-map v2(business-logic-model.md T5)の schemaVersion 不一致は loud 拒否(fail-closed — v1 読取互換なし)。
- SHA ピン4ファイル(domain-entities.md E3 / ADR-4 改訂)は実装改変の機械検出面 — SOURCE_DRIFT が fail-closed で実行を止める(既存 loader の設計保存)。
- モデル・cfg は宣言的データで実行可能コードを含まない。TLC 実行は既存 toolchain(fs-tlc-toolchain — u1 移設済み閉包)の sandbox 実行経路のまま。

## 検証劇場の回避

AsImplemented の反例トレースは実 TLC 出力のみを record 保存(business-logic-model.md T3 — 手書きトレース禁止)。
