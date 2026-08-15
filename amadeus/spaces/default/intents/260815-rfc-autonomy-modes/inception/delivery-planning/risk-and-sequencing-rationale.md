# Risk & Sequencing Rationale — intent 260815-rfc-autonomy-modes

## シーケンシングの導出

- 依存充足: B1→B8 は units DAG の位相順(U3 の park guard 廃棄 → U5、U2/U5 → U7 など全 edge を満たす)。
- 直列化: intent-autonomy.ts(U1/U2/U5)・bolt.ts(U1/U6/U8/U11)・orchestrate.ts(U3/U5)の共有 unit を同一バッチに置かない。
- 並行は file-disjoint のみ(B4: stop.ts vs autonomy 系 / B5: 4 面独立 / B6: config 系 vs 完了境界)。

## 主要リスクと手当

| リスク | 手当 |
|---|---|
| park guard 廃棄と semi 投影の順序誤り(semi が park 能力を喪失) | B3 → B4/B5 の構造で先行を固定(units DAG の hard edge) |
| Stop hook 改修の暴走(継続強制の誤解除) | U4 は対話性 fail-closed(不明→非対話=現行挙動)で退行面を既定安全側に。mode 別マトリクステスト |
| 新監査イベントによる event-count pin 群の赤化 | U3 が audit-format.md + event-registry + 既知 pin テスト(t28/t81 等)の更新を同一 Bolt に同梱(cid:build-and-test:bt-ledger-resync 系) |
| config 旧キー loud fail の波及(既存 workspace の config 赤化) | U7 で本 workspace の config.json・docs・tests・投影を同一 PR 同期(Q18 留保 — 同期不能なら選挙差し戻し) |
| RecommendationOutcome の contested 頻発(#2974 再発) | ADR-9 の contested-0 fixture(機構起因 + 通常進行)を受け入れに固定。metrics 観測項目を追加 |
| bolt.ts の逐次改修による rebase 摩耗 | B1→B5→B6→B7 の一方向直列で交差を排除(各 Bolt は前 Bolt 着地後の main から分岐) |

## 見積り合計

コード Unit 11 本 ≈ 2,020 行差分 + 文書 U12 ≈ 150 行 + 調査 U13。1 Bolt = 1 PR × 12(U13 は record のみで PR は checkpoint 同梱可)。
