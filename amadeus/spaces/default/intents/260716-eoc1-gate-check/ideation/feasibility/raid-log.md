# RAID Log — eoc1-gate-check

## 上流入力(consumes 全数)

`../intent-capture/intent-statement.md`、`../market-research/competitive-analysis.md`(blocking 択)、`../market-research/market-trends.md`(機械化トレンド)、`../market-research/build-vs-buy.md`(自作継承)、feasibility-assessment.md、constraint-register.md。

## RAID 表

| 種別 | 項目 | 状態 |
|------|------|------|
| Risk | 偽陽性拒否(正常フロー) | Open — 含意形+3系目テストで封鎖予定(requirements で固定) |
| Risk | 旧 record への遡及不適合 | Open — gate-start 時のみ発火で回避(requirements で明文化) |
| Dependency | #922 統合可否 | Open — requirements の pre-declared 判断 |
| Assumption | L1 証跡様式の安定(冒頭タイムスタンプ行) | 実測済み(本日3ファイル+本 intent 2ファイル) |
