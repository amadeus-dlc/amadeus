# performance-test instructions（260706-model-overlay）

上流入力: [code-generation-plan.md](../model-overlay/code-generation/code-generation-plan.md)、[code-summary.md](../model-overlay/code-generation/code-summary.md)

## 適用判断

不適用とする。専用の performance-test 工程は実施しない。

## 根拠

性能特性を変える変更はない。追加処理は、apply の対象 2 ファイル読み書き、parity 正規化の宣言 agent 分の文字列置換（199 engine files 中 2 件のみ）、doctor の JSON 読み 1 回であり、いずれも既存処理と同オーダーである。
