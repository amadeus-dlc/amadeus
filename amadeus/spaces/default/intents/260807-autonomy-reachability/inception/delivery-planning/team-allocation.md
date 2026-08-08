# Team Allocation — autonomy-reachability(#2378)

上流入力(consumes 全数): unit-of-work.md(Unit 境界)、unit-of-work-dependency.md(並行可否)、bolt-plan.md 相当の編成(本ステージ内)、requirements.md(NFR-3 テスト規律)、components.md(builder へ渡す責務境界 C1〜C7 の定義元)、scope-document.md。unit-of-work-story-map.md は割当の物語根拠として参照。

## 実行形態

ソロモード(単一セッション)。conductor が Bolt ごとに builder subagent(worktree 隔離)へディスパッチし、§12a reviewer(別 subagent)がレビューする — 自己実装の自己レビュー禁止(team.md role-model)を subagent 分離で満たす。

## 割当

| Bolt | builder | reviewer | 備考 |
|---|---|---|---|
| 1 (u1) | worktree 隔離 subagent(amadeus-developer-agent 相当) | §12a 宣言 reviewer | walking skeleton — 人間ゲート |
| 2 (u2) ∥ 3 (u3) | 並行2 subagent(worktree 分離、ファイル非交差実測済み) | 各 Bolt に §12a | 同時アクティブ builder ≤4(team.md 上限内) |
| 4 (u4) ∥ 5 (u6) | 並行2 subagent | 同上 | 文書中心 — deslop 適用 |
| 6 (u5) | conductor インライン可(record 内レポートのみ・repo 外 scratch 計測) | §12a | コード変更なし |

## ディスパッチ規律(worktree 隔離)

- プロンプトに本線ツリーの絶対パスを書かない・割当 worktree 外の git 操作禁止を毎回明記(cid:code-generation:c2)
- 「逸脱は実装前に停止」「モニタ待ちでターンを終えない — 検証は同期完遂」「engine/state コマンド実行禁止」を標準文言として含める(deviation-stop-before-implement / builder-prompt-sync-completion / cg-subagent-state-mutation-ban)
- 完了判定は成果物のディスク実在+内容 grep で行う(本 intent RE §13 で persist 済みの追補)
