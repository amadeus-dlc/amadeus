# Rough Mockups 質問（260705-github-kanban-sync）

上流入力: [intent-statement.md](../intent-capture/intent-statement.md)、[scope-document.md](../scope-definition/scope-document.md)、[intent-backlog.md](../scope-definition/intent-backlog.md)

人間指示（PR まで自動進行）により、推奨案で自己回答する。

---

## Q1. board の列構成はどれにしますか？

A. phase 列（Ideation / Inception / Construction / Operation）+ Awaiting Approval + Done。承認待ちゲートを持つ Intent は phase 列より Awaiting Approval を優先する
B. 進行状態列（Todo / In Progress / Done）のみ
C. stage 単位の細分列
X. Other (please specify)

[Answer]: A（推奨採用。承認待ちの優先表示が主課題 Q1=E の従課題に直結するため。自己回答: 人間指示による auto）

## Q2. カードのタイトルと本文はどうしますか？

A. タイトル = dirName（<YYMMDD>-<label>）。本文に Issue リンク、scope、worktree を記載し、カスタムフィールドで担当・ホスト・鮮度を持つ
B. タイトル = Intent の目的文（長文）
X. Other (please specify)

[Answer]: A（推奨採用。dirName は人間参照用の表示名という既存規約と一致するため。自己回答: 人間指示による auto）
