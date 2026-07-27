# スケーラビリティ要件 — U1 harness-capability-matrix

> 上流入力(consumes 全数): business-logic-model、business-rules、requirements、technology-stack

## 適用可否(N/A の判定)

U1 は稼働時サービスを持たない文書 Unit であり、負荷に応じてスケールする実行体が存在しない。business-logic-model のプローブ手順は一度きりの実測作業、business-rules の BR は全て文書規則である。したがって水平スケール・オートスケール・スループット拡張といった常駐 service 向けの拡張性指標は **N/A** とする(常駐 service 向けパターンの機械適用禁止)。

## 対象母集団の固定境界

拡張性の唯一の軸は「対象ハーネス数」だが、これは requirements FR-1 で **7 ハーネス(claude / codex / cursor / kimi / kiro / kiro-ide / opencode)に確定** した固定集合である。requirements の A-3(同時プラグイン数は少数、lockfile 不要 — 非目標で固定)も合わせて、母集団の無制限な増大は本 intent の非目標として明示されている。

business-rules の BR-U1-1(全数性)が要求するのは「7 行 × 6 面の全数」であって「任意 N ハーネスへの一般化」ではない。将来ハーネスが追加された場合は、その追加を扱う別 intent で同じプローブ手順(business-logic-model の反復可能な 5 ステップ)を再適用すればよく、本 Unit の成果物側に動的なスケール機構を持たせない。

- 合否: 成果物は 7 ハーネスの固定集合を全数被覆する(BR-U1-1 の count 照合で担保。scalability 固有の合否は設けず、この固定境界を反証可能な N/A 根拠とする)

## 決定的ファイル境界への置換

technology-stack のとおり新規ランタイム依存はゼロで、成果物は静的な record 文書(能力マトリクス+ProbeRecord)である。スケール機構の代わりに、下流 Unit(U2/U3/U6)が参照する「Bolt 3 / Bolt 6 の確定集合」を機械可読な列挙(BR-U1-7)として固定し、推論でなく参照で消費できる決定的な境界を提供する。
