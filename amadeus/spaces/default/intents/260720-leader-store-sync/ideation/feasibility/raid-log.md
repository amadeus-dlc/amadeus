# RAID Log — 260720-leader-store-sync

上流入力(consumes 全数): intent-statement.md、stakeholder-map.md

## Risks

- R-1(境界誤判定): 「leader 所有物」の抽出が過剰(メンバー snapshot 混入 = E-PM10A 違反)/過少(取りこぼし残存)になる。緩和: 決定的述語(elections/ 全量+auditShardName 導出の自シャード)+除外の落ちる実証+#1280 レビュー観点の自己検査化。
- R-2(PR 巨大化): 長期間の滞留後に生成すると #1280 級(531ファイル)になりレビュー不能。緩和: 同期契機の定義(requirements で確定)と件数上限時の分割提案。
- R-3(並行 intent 交差): e1(engine)・e2/e4(election CLI)と同時期実装。緩和: 実装面目録の着手前確認(ディスパッチ (4))— scripts/ 新規ファイルは静的非交差見込み。

## Assumptions

- A-1: leader は自クローンで tool を実行する(clone-id からの自シャード導出が正しく leader シャードを指す)。
- A-2: 選挙 store の正本は leader ブランチ上にある(メンバーは取込コピーのみ)。

## Issues

- I-1: なし(起票済み関連 Issue: #1281 本体のみ。前 intent RAID の引き継ぎ対象なし — 本 intent は新規領域)。

## Dependencies

- D-1: E-PM10A 追補(main 着地済み 2026-07-20 — 実測確認済み)。
- D-2: 方式確定選挙(requirements 段)— A/C の選択が Bolt 構成を決める。
