# Reliability Design — u5-advisories-channel

上流入力(consumes 全数): requirements, business-logic-model, business-rules, domain-entities

## 障害モードと回復

| 障害 | 挙動 | 根拠 |
|---|---|---|
| ラッチ読取失敗 | 未ラッチ扱いで emit(fail-open) | BR-U5-3 — 通知欠落 > 重複の害 |
| ラッチ書込失敗 | emit は実施(記録だけ欠落) | 同上 |
| activation 判定不能 | never-run 側(発火)へ倒す | business-logic-model.md I3 — 既存 fail-closed 方針の保存 |
| directive parse 消費側の非互換 | 実装前の棚卸しで検出(BR-U5-1)— 実装後の無音破壊を作らない | requirements FR-B2 AC / R-3 |

## 一貫性

stdout の JSON 妥当性(I1 バイト純度)は既存 emit 経路の JSON.stringify 一貫性に乗る — 部分書き込みの中間状態を作らない。
