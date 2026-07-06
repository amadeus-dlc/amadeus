# performance-test instructions（260706-doctor-guidance）

上流入力: [code-summary.md](../doctor-guidance/code-generation/code-summary.md)

## 適用判断

性能特性を変える変更はない。doctor の分岐追加は existsSync 2 回のまま、installer の追加処理は pass 分岐での文字列 includes 1 回。専用の performance-test 工程は不適用と判断する。
