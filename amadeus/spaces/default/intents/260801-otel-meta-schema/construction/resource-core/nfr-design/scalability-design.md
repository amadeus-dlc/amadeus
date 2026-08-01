# Scalability Design — U1 resource-core

上流入力(consumes 全数): scalability-requirements ほか performance-requirements / security-requirements / reliability-requirements / tech-stack-decisions は nfr-requirements SKIP により不在(expected)— スケーラビリティ要件は requirements.md NFR-2(中立境界 — 配布面スケールの根拠)から、実行環境前提は codekb technology-stack.md 260801 現在節(Bun 短命プロセス)から代替導出。business-logic-model.md(実在)の resource 搬送設計を消費。

## スケールの軸は「並行プロセス数」と「配布面数」

- 本 unit は常駐 service を持たない — 水平/垂直スケーリング・load balancing・sharding は非適用(nfr-design:c1: CLI/library では決定的 file 境界へ置換)
- 実際のスケール軸1: **並行プロセス**(複数 worktree・並行 subagent が同時 emit)。resource はプロセスローカルな不変 bag のため共有状態ゼロ — 並行度に対して線形にスケールし、ロック不要
- 実際のスケール軸2: **配布面**(7ハーネス dist+self-install)。core 1定義から package.ts が機械投影する構造を保ち、ハーネス別の resource 実装分岐を作らない(NFR-2 中立境界)

## store 容量への影響

- resource は **per-record 埋め込み**(実測: local-span-exporter.ts:39 の `CompletedSpanRecord.resource` 必須フィールド、1 span = 1 JSONL 行で追記)— 各レコード行に14属性が複製される。行あたりの増分は定数(14属性 ≈ 数百バイト)、store 総容量はレコード数に**線形**で増える
- 線形係数の増加は既存 store の増加特性(元々レコード数線形)を変えない — 本 unit が変えるのは行あたり定数のみ。容量統制が必要になった場合の縮減手段(resource の参照化・store 圧縮)は本 intent スコープ外とし、必要時に別 intent で扱う(services.md の additive 契約 — 既存 reader を壊さない — の範囲で行うことをここで制約として固定)
