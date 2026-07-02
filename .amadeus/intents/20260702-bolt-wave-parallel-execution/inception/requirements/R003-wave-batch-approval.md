# R003 wave 単位のまとめ承認の運用

## 要求

wave 内の複数 Bolt の Task Generation をまとめて `ready_for_approval` にし、まとめて承認する運用が Construction skill から読める。

## 背景

Task Generation Gate は Bolt ごとの人間承認であり、この契約は変えない（SC-OUT-004）。
複数 Bolt のまとめ承認には先例があり（20260702-shared-index-generation の Construction 判断 D003 が B002 と B003 をまとめ承認）、承認待ちキューの確認とまとめ承認の運用は確立している。

## 受け入れ条件

- 同じ wave 内の複数 Bolt の Bolt 実行準備をまとめて行い、まとめて承認を求められることが読める。
- Bolt ごとの Task Generation Gate の契約（`ready_for_approval` 停止、承認 evidence）は変更されない。
- 承認判断の記録（decision と approval evidence）は Bolt ごとに追跡できる。

## 依存

R001。

## 対応する対象境界

- SC-IN-002

## 未確認事項

- なし。
