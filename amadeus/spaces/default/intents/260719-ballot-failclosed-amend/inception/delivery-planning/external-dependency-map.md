# External Dependency Map — 260719-ballot-failclosed-amend

上流入力(consumes 全数): requirements.md、components.md、unit-of-work.md、unit-of-work-dependency.md、unit-of-work-story-map.md、team-practices.md(検証コマンド・レビュー体制の既決プラクティスは team-practices.md の live 温存版に従う)

## 依存一覧

| # | 依存 | 種別 | 状態(実測日 2026-07-19) | 閉包条件 |
| --- | --- | --- | --- | --- |
| D-1 | e1 #1261 PR の main 着地 | intent 間(直列合意) | e1 CG 進行中(E-TCRCG 裁定 A で逸脱解消済み) | 着地後に base-advance-regrounding → 本 Bolt PR 発行 |
| D-2 | 常任グラント 22ab851b | ゲート執行 | 取込済み(期限 2026-07-20T02:45:14Z、boundary 込み) | 期限内のゲート approve。失効時は leader へ更新依頼 |
| D-3 | leader worktree の elections/ corpus | FR-2 sweep の入力 | 20 選挙(AD レビュー時点実測)— glob 全数列挙で件数非固定 | sweep 実行時に実在の全ディレクトリを列挙 |

外部 SaaS・新規レジストリ依存なし(feasibility:c1 の外部前提は本 intent に不在)。

## 依存の監視方法

D-1 は e1 の完了報告(agmsg)と gh pr view の MERGED 実測で確認する(マージ通知だけを根拠にしない — close-after-landing-verification)。D-2 は期限を Bolt 着手時に再確認する。
