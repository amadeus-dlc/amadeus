# Intent Backlog — metrics-timeseries-report(MoSCoW)

上流入力(consumes 全数): `../intent-capture/intent-statement.md`、`../feasibility/feasibility-assessment.md`、`../feasibility/constraint-register.md`

## Must

| # | proto-Unit | 価値 | 依存 |
|---|---|---|---|
| M1 | snapshot リーダ(読取+version 検査+時系列ソートの純関数群) | 全機能の土台。fail-closed 読取 | なし |
| M2 | collector 別時系列の表出力 CLI(既習様式準拠) | #921 残余の直接充足 | M1 |
| M3 | テスト(in-process seam、落ちる実証: 破損 JSON/version 不一致/空 dir) | 品質契約(C5) | M1, M2 |

## Should

| # | proto-Unit | 価値 | 依存 |
|---|---|---|---|
| S1 | 期間・件数フィルタ(直近 N 件等) | snapshot 増加時の可読性(RAID Risk 対応) | M2 |

## Could

| # | proto-Unit | 価値 | 依存 |
|---|---|---|---|
| C1 | 隣接 snapshot 間 delta の併記 | 退行の目視検出を高速化 | M2 |

## Won't(本 intent では実施しない)

- グラフ描画・HTML レポート、計測系変更、schema v2 対応(出現時に別 intent)

## 順序付け

dependency-first: M1 → M2 → M3 を1本の walking slice として実装し、S1/C1 は同 slice 内で低コストなら同乗、そうでなければ落とす(小規模 intent のため Bolt 分割は delivery-planning で判断)。
