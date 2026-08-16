# Risk and Sequencing Rationale — 260816-open-bug-batch-7

## 選定ヒューリスティック

**並行既定 + 直列 fallback は risk-first**(Q1 = E-AD-E4E2A566)。WSJF スコアリングは不採用 — 3 Bolt は独立バグ修正で user-business value / time criticality に差がなく、スコアの分母(job size)だけが異なるため、スコア化は small-first と同値になりリスク情報を捨てる。リスク低減を優先する risk-first(Reinertsen の CD3 でいう risk-reduction 項の優先)を直列時の順序原理とする。

## リスク評価と順序根拠

| Bolt | 主リスク | 順序根拠 |
|---|---|---|
| 1: nsd-provenance | gate 面の削除再構成(−250〜450 行)。テスト fixture の再構成規模が見積りから振れる可能性が最も高い | 最大不確実性を最初に露出(risk-first)。失敗時の方式再裁定(D1 の逆転)に最も時間を要するため早期検証が効く |
| 2: pi-distribution | core 正本変更 → build + 全ハーネス再現性検査、ignore 生成の vendor 例外両立 | 検証面(再現性検査)が重く、失敗様式が機械的(固定件数ピン)で回復が読みやすい — 2 番手 |
| 3: sensor-docs-sync | 最小(docs + guard 拡張) | 残余 |

トポロジカル順序(2.7 の DAG)は 0 エッジのため、本順序はトポロジーからの逸脱ではない(全順序が有効な中の経済選択)。

## 並行実行の条件

- unit ごとの worktree 分離(cid:code-generation:solo-bolt-worktree-required)と coverage single-owner 規律により相互破壊なし
- 横断台帳の resync は各 PR が自変更分を持ち、マージ順の後着側が再 regen で吸収(`component-dependency.md` 共有資源節)
- クロスレビュー 2 名成立(Issue ごと)が各 unit の実装バッチ組み込み前提 — 未成立の unit はバッチから外れ、成立次第合流する
