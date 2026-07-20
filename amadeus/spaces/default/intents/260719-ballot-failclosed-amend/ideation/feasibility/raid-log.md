# RAID Log — 260719-ballot-failclosed-amend

上流入力(consumes 全数): intent-statement.md

## Risks(リスク)

| # | リスク | 影響 | 緩和策 | 状態(実測日) |
| --- | --- | --- | --- | --- |
| R-1 | amend の tally 解決規則を誤ると同一投票者の二重計上または裁定不能(hold 誤発火)を作る | 高(選挙結果の正しさ) | 設計裁定を選挙で確定してから実装(C-4)。解決規則の閉包テストを固定 | open(2026-07-19) |
| R-2 | submittedAt regex を過度に厳格化すると、既存の正当な ballot 生成経路(normalizeAt mint 形)が拒否される後方互換破壊 | 中 | 受理形は normalizeAt の mint 正規形(seconds 精度 ISO UTC)と一致させ、既存 t234/t235 corpus への遡及 sweep(corpus-sweep-for-new-guards)で両側実証 | open(2026-07-19) |
| R-3 | t238 と修正面が交差した場合の直列化待ち | 低(遅延のみ) | 現時点の対象面は t234/t235/t236 で非交差(実測)。交差発生時は着手前に leader 報告(C-2) | open(2026-07-19) |

## Assumptions(前提)

| # | 前提 | 検証状態 |
| --- | --- | --- |
| A-1 | store の amend 共存受理(`store.ts:122-133`)は正しく動作する(型・dup 除外実装済み) | 実装実在は grep 確認済み。動作は実装段の閉包テストで実証する |
| A-2 | 選挙 store は leader worktree 上にあり、投票者は `--project <leader-dir>` で vote する現行運用が継続する | 本 run で3選挙の実運用実測済み |

## Issues(顕在問題)

| # | 問題 | 状態 |
| --- | --- | --- |
| I-1 | E-CCCRA の `__NOW__` ballot 事故 — leader が store 手是正(4f636eea5)で回復済み。本 intent が恒久対応 | 回復済み・恒久対応中(2026-07-19) |

## Dependencies(依存)

| # | 依存 | 方向 | 状態 |
| --- | --- | --- | --- |
| D-1 | amend tally 解決規則の設計選挙(leader 開催) | 本 intent → 選挙 | design 段で依頼予定 |
| D-2 | e1 の #1226 intent(t238 反転) | 相互(ファイル交差時のみ) | 現時点非交差(実測) |
