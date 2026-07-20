# RAID Log — 260720-hold-choice-resolution

上流入力(consumes 全数): intent-statement.md

## Risks

| # | リスク | 緩和 | 状態 |
| --- | --- | --- | --- |
| R-1 | choice 指定の resolution が既存 HOLD_RESOLUTIONS テーブル型(Record<string, ElectionState>)と構造不整合を起こす | design で受理形を選挙裁定(テーブル拡張 vs 構文パース)し、型は判別 union で表現 | open(2026-07-20) |
| R-2 | e4 バッチとの record.ts/election.ts ファイル共有 — hunk 近接時の textual 衝突 | 関数単位非交差の相互確認済み+後着側実 diff 再接地の合意 | 緩和済み(02:50:58Z 合意) |
| R-3 | ユーザー可視契約変更該当と判定された場合の承認待ち遅延 | RA で早期判定しエスカレーションを前倒し(park 許容) | open |

## Assumptions

| # | 前提 | 検証状態 |
| --- | --- | --- |
| A-1 | winner 描画の実現経路(#1268)は RE で確定できる | RE diff-refresh で実測予定 |
| A-2 | resolutions 配列の既存永続化経路は choice 情報の追加に耐える(スキーマ拡張可能) | tally.json 実データで RE 確認 |

## Issues

なし(新規発見なし — 2026-07-20)。

## Dependencies

| # | 依存 | 状態 |
| --- | --- | --- |
| D-1 | #1268/#1273/#1277 の main 着地 | 着地済み(実測) |
| D-2 | e4 バッチの並行進行 | 並行合意済み・順序予約なし |
