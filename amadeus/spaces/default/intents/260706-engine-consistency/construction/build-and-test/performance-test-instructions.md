# performance-test instructions（260706-engine-consistency）

上流入力: [code-summary.md](../engine-consistency/code-generation/code-summary.md)

## 適用判断

性能特性を変える変更はない。追加処理は complete-workflow 時の checkbox 走査（1 workflow 高々 30 stage 程度）、`next` の文字列比較 1 回、hook の registry 読み 1 回、validator の readdir 1 回であり、いずれも既存処理と同オーダーである。専用の performance-test 工程は不適用と判断する。
