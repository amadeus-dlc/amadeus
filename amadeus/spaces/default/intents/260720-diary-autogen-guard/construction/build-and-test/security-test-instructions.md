# Security Test Instructions — 260720-diary-autogen-guard

上流入力(consumes 全数): code-generation-plan.md、code-summary.md

## 攻撃面評価(devsecops 観点)

- 新規入力経路なし(memory_path はエンジン内部生成値、外部入力ではない)。advisory は stderr のみで stdout 契約(directive JSON)不変 — 下流 parser への注入面なし(NFR-2 実証テストあり)。
- 書込先は従来どおり record dir 配下の memory.md のみ(パス組み立ての変更なし — 単一値導出はむしろ書込先の予測可能性を上げる)。

## 合否基準

stdout 非汚染テスト green(達成)。既存 template-missing 警告の維持(達成)。
