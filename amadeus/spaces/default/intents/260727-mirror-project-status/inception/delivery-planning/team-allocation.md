# Team Allocation — Intent Mirror の GitHub Project Status 同期

上流入力(consumes 全数): requirements, components, unit-of-work, unit-of-work-dependency, unit-of-work-story-map, team-practices

## 体制(ソロモード)

team-practices の運用モード判定に従いソロモードで実行する(team-formation はスコープ外スキップ — 存在しない named mob を捏造しない)。1セッションが conductor / builder / reviewer 相当の責務を工程ごとに担い、独立レビューは §12a reviewer subagent(product-lead / architecture-reviewer / code-reviewer 系)で確保する。

| 責務 | 担い手 | 備考 |
|------|--------|------|
| conductor | 本セッション | engine 指令ループ・ゲート・§13 の執行 |
| builder(code-generation) | worktree 分離の developer subagent(swarm 経路)または conductor 直営 | unit-of-work の Unit 単位。requirements/components からの逸脱は実装前停止(cid:code-generation:deviation-stop-before-implement) |
| reviewer | §12a 宣言 reviewer subagent | 自己実装の自己レビュー禁止を subagent 独立性で担保 |
| 承認者 | ユーザー(人間) | 全ステージゲート・Bolt ゲート・PR マージ(no-AI-merge) |

## 並行度

- 同時アクティブ builder は最大4(org.md)だが、本 intent は5 Bolt 直列既定(bolt-plan)のため通常1。U3/U4 の並行格上げ時のみ2(worktree 分離+unit-of-work-dependency の独立性+交差実測が前提)。

## スケジュール

ハード期限なし(requirements の Assumptions / intent-statement)。Bolt 1 の mutation 実証が最初のマイルストーン(unit-of-work-story-map のジャーニー1がこの時点で成立)。
