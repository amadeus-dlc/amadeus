# RAID Log — 260720-goa-sparse-family

上流入力(consumes 全数): intent-statement.md(+同ステージ内: feasibility-assessment.md、constraint-register.md)

## Risks

| ID | リスク | 影響 | 緩和 | 状態 |
|---|---|---|---|---|
| R-1 | スパース受理((a))の bin 拡張が既存 canonical 8-bin 消費(選挙 CLI checkGoaLine round-trip)を壊す | 中 | 受理域拡大のみ・render 側は canonical 出力維持を設計で固定。t238/t-norm-metrics の回帰全数 | open(2026-07-20) |
| R-2 | 圧縮形撤去後、旧 record(58 dir 規模)の GoA 行と新 record の code 表記が混在し verify/照合の解釈が分岐 | 中 | C-2 の読み側後方互換裁定で明文化(遡及なし=混在容認 or 読み分岐) | open(2026-07-20) |
| R-3 | 並行 intent(e2 #1267)のスコープ変動で record.ts/election.ts の離隔が崩れる(intent-statement.md のスコープ境界 Out 面が前提) | 低 | C-5 の即時相互通知+着手前実 diff 再判定(c6) | open(2026-07-20) |

## Assumptions

| ID | 前提 | 検証 |
|---|---|---|
| A-1 | GOA_HEAD_RE 複節化(#1256)は着地済みで再退行なし | origin/main :162 実測済み(本ステージ) |
| A-2 | ECODE_RE の消費は :393 count-only のみ(#1256 後の行) | #1257 クロスレビュー+本ステージ再確認 |

## Issues

なし(2026-07-20 時点 — 前 intent からの引き継ぎ Issue なし。対象3 Issue は本 intent の主題)。

## Dependencies

| ID | 依存 | 状態 |
|---|---|---|
| D-1 | #1254 方式・C-2 互換・t238:102 の扱いの RA/design 選挙(leader 開催) | requirements 段で依頼予定 |
| D-2 | e2 #1267 との非交差維持 | 合意済み・監視中 |
