# security-test instructions（260706-engine-consistency）

上流入力: [code-summary.md](../engine-consistency/code-generation/code-summary.md)

## 適用判断

認証情報・外部入力境界・権限に触れる変更はない。#548 の codekb 直接解決はローカルファイルの実在確認であり、`input.base.replace(/\/intents\/[^\/]+$/, "")` は末尾 1 セグメントのみ除去するため path traversal を許さない（reviewer が実コードで確認済み）。専用の security-test 工程は不適用と判断する。
