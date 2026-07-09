# Stage Diary — functional-design(3.1)

## Interpretations

- 2026-07-09T14:55:00Z — units 不在(refactor スコープ)のため単一ユニット `small-band` として設計成果物を construction/small-band/functional-design/ に配置(engine per-unit resolver 契約に整合 — integrity-batch での学びを適用)。
- 2026-07-09T14:55:00Z — frontend-components.md は CLI/テスト基盤 intent のため不作成(reviewer 妥当性確認済み)。

## Deviations

- (なし)

## Tradeoffs

- 2026-07-09T14:55:00Z — P-PL2 は独立業務ルール文書ではなく決定表の形状不変条件(全域性・部分域決定性・出現域排他)として定義; install 側 classifyAction に BR-* コメント不在のため。reviewer 判定はトートロジー非該当・NFR-3 充足。実装時に BR-I* コメント追加提案(Minor)。

## Open questions

- 2026-07-09T14:55:00Z — 教訓: プロパティカタログは起草時に実装と逐条照合してから提出する(strict/非 strict、分岐優先順は law の形を変える — iter1 で Critical/Major 各1を消費)。
