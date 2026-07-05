# Team Formation 質問（260705-github-kanban-sync）

上流入力: [scope-document.md](../scope-definition/scope-document.md)、[intent-backlog.md](../scope-definition/intent-backlog.md)、[feasibility-assessment.md](../feasibility/feasibility-assessment.md)

このプロジェクトは 1 人の Maintainer と複数エージェントの体制であり、団体編成の余地は小さい。
確認は実装担当と PR 監視体制の 2 点に絞る。

---

## Q1. 本 Intent の Construction（P1〜P3 の実装）はどの体制で進めますか？

A. Claude セッション（本セッション系）が P1〜P3 を直列に担当する
B. P1〜P3 を別エージェント（worktree 分離）に割り振って並行させる
C. 段階ごとに空いているエージェントへ割り振る（着手時に判断）
X. Other (please specify)

[Answer]: A（推奨採用。人間指示「推奨選択で進めて。autoで」による本ステージ限りの自己回答）

## Q2. PR レビュー体制は従来どおりでよいですか？（レビューボットのコメント対応 + CI green + 人間 merge）

A. 従来どおりでよい
B. 本 Intent は追加のレビュー観点を設けたい（Other で指定）
X. Other (please specify)

[Answer]: A（推奨採用。同上）
