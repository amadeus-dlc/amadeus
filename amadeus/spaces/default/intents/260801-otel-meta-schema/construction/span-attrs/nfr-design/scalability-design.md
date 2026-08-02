# Scalability Design — U2 span-attrs

上流入力(consumes 全数): scalability-requirements ほか performance-requirements / security-requirements / reliability-requirements / tech-stack-decisions は nfr-requirements SKIP により不在(expected)— スケーラビリティ面は requirements.md NFR-2(中立境界)から代替導出。business-logic-model.md(実在)の resolver 出力が span record への per-record 埋め込みで載る構造を消費。tech-stack 前提は codekb technology-stack.md 260801 現在節に依拠。

## スケール特性

- resolver 出力は span attributes として per-record 埋め込み(1 span = 1 JSONL 行の既存構造)— 行あたり6キーの定数増、総容量は span 数に線形(既存特性を変えない)
- 共有状態ゼロ(resolver はプロセスローカル memo のみ)— 並行プロセス・並行 worktree の同時 span 生成に対して線形スケール、ロック不要。cursor ファイルは読取専用アクセスで競合面なし
- 配布面: core 1定義から7ハーネスへ機械投影(NFR-2)— ハーネス別 resolver 分岐なし。agent.type/id は env 受け口のみでハーネス知識を core に持ち込まない

## 非適用(nfr-design:c1)

sharding・load balancing・水平スケーリングは非適用 — ローカル JSONL 構造の library 層。
