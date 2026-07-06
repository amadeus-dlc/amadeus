# Risk and Sequencing Rationale — Presence Evidence（260705-presence-evidence）

上流入力: [bolt-plan.md](bolt-plan.md)、[raid-log.md](../../ideation/feasibility/raid-log.md)

## 順序の根拠

作業は 1 方向（文書化）に収束済みで、順序リスクは parity-map の並行接触（R-3 縮退版）だけである。着手前ピア確認 → 執筆 → 検証の直列で足りる。

## リスク対応

| リスク | 対応 |
|---|---|
| #428 が parity-map を同時に触る | 着手前ピア連絡で確認。衝突時は union（reason 文字列の追補は独立段落で書き、機械的に統合可能にする） |
| 記述と実装のドリフト | FR-2.3（執筆時の実装再読了）+ 実装ファイル・関数名の明示参照で PR レビューに委ねる |
