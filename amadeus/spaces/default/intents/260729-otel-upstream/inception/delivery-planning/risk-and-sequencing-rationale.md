# Risk & Sequencing Rationale — OTel Upstream 統合

上流入力（consumes 全数）: `requirements.md`、`components.md`、`unit-of-work.md`、`unit-of-work-dependency.md`、`unit-of-work-story-map.md`、`team-practices.md`（参照済み）

## 採用ヒューリスティック

risk-first（Reinertsen の CD3 的なリスク低減価値の最大化）と walking-skeleton-first（Cockburn）の併用。本 initiative では両者が同一の序列を与える（Q1-A）: U1 がアーキテクチャ全層を貫く skeleton であり、同時に最大リスク（Bun Context・Logs API stability・bundle 構成・同期 I/O 性能）の検証であるため。

## 序列の根拠

1. **Bolt 1（skeleton）を最初に**: 不合格なら initiative 撤回の hard gate（approval-handoff AH-4）。後続10 Bolt の投資はすべて Bolt 1 の合格に条件付けられるため、リスク低減価値が最大。WSJF 的にも job size M/L に対し risk-reduction value が全 Bolt 中最大で先頭は自明
2. **Bolt 2-4 を次の並行バッチに**: U2/U3/U5 は U1 のみに依存し互いに独立（`unit-of-work-dependency.md` の並行機会どおり）。3 builder の gated swarm で消化
3. **Bolt 5（local-exporters）を直列で**: U2＋U3 の両方に依存する合流点。Registry の受理集合と schema v2 codec が揃って初めて本番化できる
4. **Bolt 6-7 を次の並行バッチに**: U6（reader 差替え）と U9＋U10（Metrics/Logs）は互いに独立
5. **Bolt 8-10 を直列で**: 削除と縮退は順序依存（call site ゼロ → 削除ゲート → shadow 撤収）。ここで並行化すると削除ゲートの判定が不正確になる

## トポロジからの逸脱

なし。Bolt 序列は `unit-of-work-dependency.md` の DAG のトポロジカル順序と一致する（risk-first と依存順が同一序列を与えた）。逸脱が生じた場合は本書への記録が必要だったが、不要だった。

## 主要リスクと早期化の対応

| リスク | 対応 Bolt | 早期化の理由 |
|---|---|---|
| R-1 Bun Context 不成立 | Bolt 1（最上位検証項目、Q5-A） | 全設計の前提。工数見積（Adapter 実装）に直結 |
| R-2 Logs API stability | Bolt 1（採否 ADR） | 上流 Interface の形状に直結 |
| R-3 移行 drift（1600 call site） | Bolt 8（shadow 比較＋call-site guard） | Bolt 1/5 の検証基盤（shadow ハーネス原型）で先行して土台を作る |
| R-5 例外握りつぶし | Bolt 1（テスト先行順序の1番目） | 失敗契約は全後続の不変条件 |
| R-6 harness 同期漏れ | 全 Bolt（distribution drift guards を完了条件に含有） | 正本→生成面の規則を各 Bolt で強制 |

## 経済的判断の備考

厳密な WSJF スコアリング（Q1-B）は採用しなかった。risk-first と依存順が一致し、スコアリングが序列を変えないため（計算コストのみ）。
