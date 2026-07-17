# Team Allocation — metrics-timeseries-report

上流入力(consumes 全数): `../requirements-analysis/requirements.md`、`../application-design/components.md`、`../units-generation/unit-of-work.md`・`unit-of-work-dependency.md`・`unit-of-work-story-map.md`、`../practices-discovery/team-practices.md`

## 割当

| 役割 | 担当 | 根拠 |
|---|---|---|
| conductor / builder | e2(本セッション) | leader ディスパッチ 20:58:16Z(agmsg 出典)— #921 残余の実装まで一任。1 Bolt・単一ファイルのため builder 並行不要(parallel-bolts の枠内) |
| reviewer | 実装者以外(PR 時に leader 経由で指名、または独立 subagent レビュー併用) | 自己実装の自己レビュー禁止(role-model) |
| マージ執行 | leader(ユーザー承認後) | leader-executes-merge |

## 並行度

同時アクティブ builder = 1(上限4の枠内)。worktree 分離は単一 builder のため不要(自ツリーで実装、Bolt ブランチは origin/main 起点で切る — base-advance-regrounding)。
