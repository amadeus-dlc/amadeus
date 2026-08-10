# Intent Backlog — 260810-numeric-provenance-guard

上流入力(consumes 全数): intent-statement(../intent-capture/intent-statement.md の Success Metrics を受け入れ条件の源とした)。feasibility-assessment / constraint-register は feasibility SKIP のため不在(scope-document.md と同じ代替制約源)。

## Prioritized Proto-Units(MoSCoW)

| # | Proto-Unit | MoSCoW | 依存 | 受け入れ条件の要点 |
|---|---|---|---|---|
| P1 | 述語プロトタイプ + corpus sweep | Must | なし | 対象クラス(成果物種別×数値の意味クラス)別の未併記率を実測し、観測レンジを確定。検索述語3要素(パターン・対象集合・除外)を再実行可能な形で記録(E-ASD-RES13) |
| P2 | 対象クラス・閾値・適用範囲の確定 | Must | P1 | しきい値が観測レンジの内側(c1-threshold-inside-observed-range)。遡及方針(enforcement cutoff 採否)の設計裁定を含む |
| P3 | センサー manifest + 検査ツール本実装 | Must | P2 | advisory センサーとして発火・PASS/FAIL 判定。適用限定(定型 ack 対象外)を対象選択に写像。#1237 共通化裁定を設計に反映 |
| P4 | 落ちる実証 fixture + 正当コーパス緑側実証 | Must | P3 | 併記なし数値断定 fixture で FAILED(赤側)+ 既存正当コーパスで偽陽性が確定閾値内(緑側) |
| P5 | 配布同期・CI 充足 | Must | P3 | `bun run build` 再生成、typecheck/lint/テスト/coverage/complexity/drift 全ゲート green |
| P6 | ドキュメント(センサー一覧への追記等) | Should | P3 | docs の件数表記は隣接列挙原則(c3-adjacent-enum-numerals)に従う |

## Value Stream

起草時の数値違反 → (現行) §12a レビュー捕捉・イテレーション消費 → (導入後) センサーが起草直後に advisory FAILED → 起草者が自己是正 → レビューは実質検証(再導出)へ集中。

## Won't(本 intent)

第2段の書式検査 / 自動再実行照合 / #1237 実装 / 算術誤り検出(scope-document.md Out of Scope 参照)。
