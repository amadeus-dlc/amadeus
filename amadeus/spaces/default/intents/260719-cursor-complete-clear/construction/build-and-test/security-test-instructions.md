# Security Test Instructions — 260719-cursor-complete-clear

上流入力(consumes 全数): code-generation-plan, code-summary

## 方針(比例選定)

攻撃面の変更なし(認証・入力受理・外部 I/F 非変更 — build-and-test:c3 の比例選定)。監査トレイル完全性の観点のみ:

## 検査

- 監査 forge 防御(escapeAuditValue)非退行: 既存 t07/t243 の通過で確認
- status ゲートが「監査の意図的無効化」に使えないこと: ゲートは registry の complete 確定値のみで発動し、書き手は updateIntentStatus(complete-workflow 経路)に限られる — 検証は t243 の in-flight 非阻害テストと complete-workflow 正常系で担保
