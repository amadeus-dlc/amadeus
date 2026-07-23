# Scalability Requirements — U1-mirror-tool

上流入力(consumes 全数): business-logic-model.md、business-rules.md、requirements.md

## SC-U1-1: 対象規模

status の対象は単一 intent(--intent 指定 or active)。全 intent 横断の一括診断は本 unit のスコープ外(W-04 — 本体拡張なし。将来必要なら別 intent)。intents.json の行数増(現状66行)に対し線形読取1回のみで、既存 buildSnapshot と同一の規模特性。

## SC-U1-2: 将来拡張の境界(明示)

複数 intent 一括診断・並列 gh 呼出等のスケール機構は導入しない(YAGNI — W-04 と同根)。必要が実測されたら別 intent の requirements で規模条件(件数・ページング — requirements-analysis:c4 チェックリスト)から再設計する。
