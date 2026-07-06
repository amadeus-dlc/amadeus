# Mob Composition（260705-engine-installer）

上流入力: [team-assessment.md](team-assessment.md)

## 編成

mob（複数エージェントの同時協働）は編成しない。

変更作業は engineer2 の worktree 1 個に閉じ（多体連携の運用 = 1 Intent : 1 worktree）、単一 PR（scope-definition Q2 = A）を直列に進める。同一 worktree 内の検証（`npm run test:all`、専用 eval）の信頼性を保つため、Bolt も直列実行とする。

## 協働が発生する場面

| 場面 | 形 |
|---|---|
| 技術的な内容確認 | ピア協議（leader + engineer1, 3 宛、期限 15 分・回答 1 件で成立） |
| gate 承認 | leader の内容確認 + 中継承認定型文（包括委任、auto 運用） |
| エンジンレイアウトの変更検知（R-1） | 並行 Intent（#428、bug 束ね）の merge 通知を leader / ピアから受けて追従 |
| PR レビュー | レビューボット対応は engineer2、merge 判断は Maintainer |
