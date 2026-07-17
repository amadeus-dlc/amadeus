# Decision Log — opencode-plugins-hooks(Issue #1049)

上流入力(consumes 全数): `../intent-capture/intent-statement.md`、`../feasibility/feasibility-assessment.md`、`../feasibility/constraint-register.md`、`../feasibility/raid-log.md`、`../scope-definition/scope-document.md`、`../scope-definition/intent-backlog.md`。

## 裁定履歴(事実記録 — git/agmsg 出典分離)

| # | 決定 | 出典 |
|---|---|---|
| D-1 | intent 着手(ユーザー指示、e3 割当 — 領域アフィニティ) | leader ディスパッチ 2026-07-16T20:56:20Z(agmsg) |
| D-2 | スコープ = amadeus(feature から訂正、birth し直し) | ユーザー裁定 21:02:58Z+周知精密化 21:06:04Z(agmsg)。record: birth コミット 010250b42(git) |
| D-3 | E-OC1 0問判定 ×4(IC/FS/SD/AH) | leader 承認 21:02:46Z / 21:12:34Z / 21:21:27Z / 21:28:14Z(agmsg)— 各 questions ヘッダに証跡固定 |
| D-4 | GO(条件付き): 配線は文書化/一次ソース確定イベント限定、HUMAN_TURN 相当は RE 直読で確定 | feasibility-assessment.md(git — docs WebFetch・dist ls の実測接地) |
| D-5 | 受け入れ境界: 配線数 0 でも根拠付き確定表で充足 | scope-document.md(git) |
| D-6 | IC diary 未記帳の是正(e4 留保)+再発防止(テンプレ実在時も観察追記) | E-1049-IC 開票 21:09:27Z(agmsg)+是正コミット(git) |

## ハンドオフ条件

- inception へ渡す確定入力: In 4/Out 5、C-1〜C-6、R-1〜R-3、B-1〜B-3、GO 条件
- 逸脱は実装前停止 / per-PR マージ伺い / E-OC1 3段継続
