# performance-test instructions（260706-runtime-graph-registrati）

上流入力: [code-summary.md](../runtime-graph-registration/code-generation/code-summary.md)

## 適用判断

性能特性を変える変更はない。regex 拡張は alternation 1 分岐の追加、自己修復は失敗時に限る compile 1 回（30 秒 timeout、決定論・冪等）で、gate 時の 1 呼び出しに閉じる。専用の performance-test 工程は不適用と判断する。
