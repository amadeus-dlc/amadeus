# Security Test Instructions — eoc1-gate-check

## 上流入力(consumes 全数)

`../eoc1-gate-guard/nfr-design/security-design.md`(層別表)、`../eoc1-gate-guard/code-generation/code-summary.md`。

## 適用判断(N/A、根拠付き)

読み取り専用・eval なし・パス連結なし(層別表を reviewer が実装直読で確認済み)— 攻撃面追加ゼロにつき c3 により選定対象外。既存必須 scan は CI で継続(省略なし)。
