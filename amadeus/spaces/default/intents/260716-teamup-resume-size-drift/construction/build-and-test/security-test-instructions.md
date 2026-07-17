# Security Test Instructions — teamup-resume-size-drift(Issue #1081)

上流入力(consumes 全数): fix-1081-size-drift の code-generation-plan.md / code-summary.md。

## 判定: N/A(追加検査なし — 根拠付き、build-and-test:c3)

コメント1行の追加のみ — 依存・入力境界・秘密情報・権限のいずれにも接触しない(git diff 1 file/1 insertion 実測)。既存必須 scan(lint/typecheck/CI)は全 green 維持(省略なし)。

## 再発時の入口

本ファイル種別(テスト宣言行)にセキュリティ面はなく、恒久 N/A。実行コードへ触れる変更が生じた場合はその intent で再評価する。
