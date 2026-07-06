# User Flow — Maintainer の利用動線（260705-github-kanban-sync）

上流入力: [intent-statement.md](../intent-capture/intent-statement.md)、[scope-document.md](../scope-definition/scope-document.md)、[intent-backlog.md](../scope-definition/intent-backlog.md)

board の列とフィールドは intent-backlog.md の P2（kanban-sync-manual）が初期構築する。ここに書く動線はその構築後の利用を前提とする。

## フロー 1: 並行状況の一覧（主課題）

1. Maintainer が board を開く（amadeus repo の Projects リンクから）。
2. 列で全 Intent の phase 分布を見る。カードの Agent / Host / Worktree カスタムフィールドで「どのエージェントが、どのホストで、どの worktree を使っているか」を確認する。複数 Intent を横断比較するときは Table view に切り替え、全フィールドを列として見る（wireframes.md「横断一覧」）。
3. Synced At が古いカードは鏡が遅延していると判断し、必要ならローカル（`aidlc-state.md`）を直接確認する。

## フロー 2: 承認待ちの処理（従課題）

1. Awaiting Approval 列を見る。
2. カード本文の current stage と Issue リンクから対象を特定する。
3. 該当セッションでゲート承認（または遡及承認）を行う。
4. 次回 sync でカードが phase 列へ戻る（board 側の操作は不要）。

## フロー 3: 新規 Intent の並行可否判断

1. board で進行中 Intent の変更対象（worktree、scope、Issue）を一覧する。
2. 接触面の有無は正であるローカル成果物と Issue で確認する（board は入口であり判断根拠にしない = kanban は人間専用の鏡）。

## 操作しないこと

- board 上でカードを動かす、フィールドを編集する（次回 sync で上書きされる）。
- board を見てエージェントが並行可否を判断する（エージェントはローカル成果物を読む）。
