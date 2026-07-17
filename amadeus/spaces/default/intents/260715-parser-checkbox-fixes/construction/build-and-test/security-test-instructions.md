# Security Test Instructions — parser-checkbox-fixes

**N/A(根拠付き)**: 攻撃面の変化なし — 新規入力経路・権限・秘密情報・外部サービスの追加ゼロ(#1013 は既存 draft 入力の検証**強化** = fail-closed 化でセキュリティ posture はむしろ向上、#1015 は内部状態写像のみ)。build-and-test:c3(攻撃面・依存・承認 NFR の実測明記がある場合のみ比例選定)により個別セキュリティ検査は非適用。既存必須 scan(CI の lint/型検査)は通常どおり実施済み。
