# U3 subagent-stats — Scalability Design

**上流入力(consumes 全数)**: `business-logic-model`(走査フェーズの構造 — 本書のスケール軸の対象)。条件解決で除外された consumes(`performance-requirements` / `security-requirements` / `scalability-requirements` / `reliability-requirements` / `tech-stack-decisions`)は nfr-requirements SKIP による設計上の不在(directive の `consumes_absent` expected: true)。

**測定 ref**: observed `7060956c5617125dd2f4e284957aa180cb306484`

## スケール軸の特定

本 Unit は常駐サービスではない単発 CLI — horizontal scaling / load balancing / auto-scaling は N/A(`nfr-design:c1` — CLI に常駐サービス向けパターンを機械適用しない)。実在するスケール軸は**入力データの成長**のみ:

1. **intent 数の成長**(シャード数): glob 走査は線形 — intent は概算で百規模(未計測の概算)、年間成長でも数百のオーダー
2. **シャード行数の成長**(append-only の単調増加): 走査は行数線形。SUBAGENT_* 行の選別により保持メモリは対象行のみ
3. **space 数の成長**: 既定は単一 space の走査(`--space` 指定)— 全 space 横断は要求されていない(スコープ外を先取りしない)

## 成長への構え(決定的ファイル境界)

- **ストリーミング読み**: シャードは行単位で読み、ファイル全体の一括読込に依存しない実装を許容する設計(現行規模では readFileSync + split でも成立 — 実装は単純側を選び、メモリ実測が問題化した時点で行ストリームへ差し替え可能な seam 境界(走査フェーズ/compose の分離)を既に持つ)
- **集計構造は有界**: byVerdict は4値固定、byType / byModel / byModelSource は distinct 値数に比例(型は数十・model は数種の概算 — 未計測の概算であり、正確な distinct 数は Bolt 3 の R-2 再計測が実出力で確定する)— corpus 行数に比例しない

## 明示的な非採用

- キャッシュ・インデックス・差分集計(前回結果との増分)は**採用しない** — audit は移動値で毎回の全数再計数が正(FR-4b の測定 ref がその時点を固定する)。差分集計は「いつの時点の集計か」の同一性を壊す複雑さに見合わない
