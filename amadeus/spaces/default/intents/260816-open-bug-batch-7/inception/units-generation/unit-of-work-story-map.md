# Unit of Work Story Map — 260816-open-bug-batch-7

## 前提

user-stories ステージは self-fix スコープで SKIP(バグ修正 intent のためユーザーストーリーは生成しない)。本マップは stories の代わりに **requirements.md の FR** を各 unit へ対応づける。

## FR → Unit 対応

| FR | Unit | 実装順(unit 内) |
|---|---|---|
| FR-PI-1(3 面へ pi 追加) | pi-distribution | 1(テスト Red 実測 → 集合追加) |
| FR-PI-2(ignore/attributes の vendor 例外両立) | pi-distribution | 2 |
| FR-PI-3(固定件数ピン 3 本 + docs 同期) | pi-distribution | 3(FR-PI-1 の Red がここで Green 化) |
| FR-NSD-1(fallback 退役 — D1 上書き後 AC) | nsd-provenance | 1(events 欠落 fail-closed の negative test 先行) |
| FR-NSD-2(死経路除去) | nsd-provenance | 2 |
| FR-SEN-1(07 表の 13 件同期) | sensor-docs-sync | 2(guard 拡張後に同期) |
| FR-SEN-2(t3028 拡張) | sensor-docs-sync | 1(落ちる実証の Red を先に実測) |

## 横断事項

- unit を跨ぐ FR はなし(被覆検証: FR 7 件すべてがちょうど 1 unit へ割当、全 unit が FR を持つ)
- 各 unit の完了 = 対応 Issue のクローズ条件充足(着地検証は landing 後に実施)
