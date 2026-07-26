# Team Allocation — plugin-host-delivery

> 上流入力(consumes 全数): requirements、components、unit-of-work、unit-of-work-dependency、unit-of-work-story-map、team-practices

## 実行形態: ソロモード(team-practices の O1 継承)

named mob・複数メンバーの staffing は捏造しない(approval-handoff:c3 と同旨)。割当は役割(帽子)で定義する。

| 役割 | 担い手 | 適用 |
|---|---|---|
| conductor | 本セッション(ソロ) | 全 Bolt のディスパッチ・ゲート執行・検証裏取り |
| builder | Task サブエージェント(worktree 分離) | Bolt 2-8 の実装(unit-of-work.md の Unit 単位)。ディスパッチプロンプトに逸脱停止・同期完遂・worktree 限定を明記(c2 / builder-prompt-sync-completion / deviation-stop-before-implement) |
| reviewer | §12a reviewer subagent(per-unit Construction ステージの宣言に従う) | 自己実装の自己レビュー禁止を subagent 分離で担保 |
| 調査(U1) | conductor 主導+read-only Explore サブエージェント | 外部 seam プローブは本番経路の前処理を全数再現(probe-preprocessing-parity) |
| 承認 | ユーザー | 全ゲート・PR マージ・skeleton ラダー選択 |

## 並行度

Bolt 3-5 の並行実装は同時アクティブ builder 最大 4 の枠内(parallel-bolts)。ファイル交差(特に dist 再生成面と engine 移設面)は着手前に対象ファイル目録+実 diff で判定し、交差時は直列化(c6)。
