# Shared Infrastructure — u001-presence-evidence（260705-presence-evidence）

上流入力: [external-dependency-map.md](../../../inception/delivery-planning/external-dependency-map.md)、[logical-components.md](../nfr-design/logical-components.md)

## 共有資産との接触

| 共有資産 | 接触 | 解消 |
|---|---|---|
| audit-format.md（エンジン knowledge） | #428 が統合中（RECOMPOSED + 70→71） | BR-7: 反映は #428 merge 後、実形に適合 |
| parity-map.json | #428 が exceptions 整理中 | 同上（reason 追補は merge 後の実形へ） |

注記: external-dependency-map.md（inception、縮退時点）は parity-map.json のみを唯一の接触として挙げるが、その後の engineer1 訂正（decision 2026-07-06T00:34:53Z）で audit-format.md も直接接触と判明した。inception 成果物は書き換えず、本表と BR-7 で追跡する。接触 2 点の扱いは logical-components.md の 4 層構成（下書き隔離 → 本文反映 → 乖離台帳）と対応する。

## 適用判断

上記 2 点以外の共有インフラは存在しない（不適用）。
