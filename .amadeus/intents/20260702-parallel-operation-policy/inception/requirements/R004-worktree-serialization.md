# R004 同一 worktree での実行の直列化

## 要求

同一 worktree 内の作業を直列に実行し、並行は worktree 単位で行う使い分けの基準が steering policy から読める。

## 背景

#334 の cycle で、同一 worktree 内の Bolt を直列実行して検証（`test:all` など）の競合を避け、並行は worktree 間で行う実例が観察された。
検証コマンドは作業ツリー全体を対象にするため、同一 worktree 内の並行実行は検証結果の信頼性を壊す。

## 受け入れ条件

- 同一 worktree 内では Bolt と検証を直列に実行する基準が policy から読める。
- 並行を worktree 単位（Intent 単位）で行う基準が policy から読める。
- 基準の根拠が、観察した実例への参照リンクで追跡できる。

## 依存

なし。

## 対応する対象境界

- SC-IN-001
- SC-IN-002
- SC-IN-003
- SC-IN-005

## 未確認事項

- なし。
