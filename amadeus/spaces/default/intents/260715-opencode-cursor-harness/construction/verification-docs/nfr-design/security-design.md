# Security Design — U4 verification-docs

intent: 260715-opencode-cursor-harness / Unit: U4
上流入力: nfr-requirements(security-requirements.md SR-U4-1/2)。

## 設計

docs の例示はプレースホルダ定型(`<your-project>` 等)に統一(SR-U4-1 — レビュー観点で grep)。権限モデル差の記載は services.md 機能表の転記+opencode.json.example への参照のみ(SR-U4-2 — 独自の推奨設定を発明しない)。

## 上流参照(consumes 全数)

本設計の入力: 同 unit の nfr-requirements 5点(performance-requirements.md / security-requirements.md / scalability-requirements.md / reliability-requirements.md / tech-stack-decisions.md)+ functional-design の business-logic-model.md。継承元 = U1 の nfr-design(U1 自身は本節が自己参照)。
