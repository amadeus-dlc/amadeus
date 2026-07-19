# Team Allocation — election-ts-foundation

> 上流入力(consumes 全数): requirements.md、components.md、unit-of-work.md、unit-of-work-dependency.md、unit-of-work-story-map.md、team-practices.md

実装は将来 intent(scope-document W-08)のため、固定メンバー名の割当は捏造しない(approval-handoff:c3 — 未確定 staffing の先取り禁止)。ここで確約するのは**割当モデル**(役割・並行度・制約)のみで、名指しは実装 intent 起動時に leader が当時の稼働状況で行う。

## 割当モデル

| Bolt | 必要役割 | 並行度 | 割当制約(team-practices.md live 準拠) |
|---|---|---|---|
| 1 walking-skeleton | builder 1+reviewer 1 | 1 | 単独ゲート Bolt — conductor 連続割当回避、自己実装の自己レビュー禁止 |
| 2 model-complete | builder 1+reviewer 1 | 1 | U1 は純関数層 — unit テスト同時作成(テスト第一級) |
| 3 io-record-transport | builder 1-3+reviewer | 最大3(U2/U3/U4) | 同時アクティブ builder 上限4の枠内。worktree 隔離+c2 規律(本線パス非混入)。ファイル交差時は直列化 |
| 4 cli-complete | builder 1+reviewer 1 | 1 | 4ユニット合流点 — 統合検証はホスト負荷収束後(fanout-load-settle) |
| 5 skill-wrap | builder 1+reviewer 1 | 1 | 実演層はトークン予算に配慮(rate-limit-idle-allowance) |

## モード適応

- **チームモード**: 上表どおり(agmsg 配送・ack・クロスレビュー適用)
- **ソロモード**: builder/reviewer を工程順次で1セッションが担い、レビューは独立 subagent(自己実装の自己レビュー禁止の solo 系代替 — team-practices.md Operating Modes 準拠)。Bolt 3 の並行は Task サブエージェント fan-out(c2 隔離付き)で代替可
