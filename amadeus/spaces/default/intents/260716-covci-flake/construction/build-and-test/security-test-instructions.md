# Security Test Instructions — 260716-covci-flake

## 上流入力(consumes 全数)

`code-generation-plan.md`(変更目録)、`code-summary.md`(閉包表)。

## 適用判断(N/A、根拠付き)

コード変更ゼロ(`code-generation-plan.md` の変更目録どおり — 裁定 A)・攻撃面変化なし — build-and-test:c3 により選定対象外。既存必須 scan は CI で継続稼働(省略なし)。
