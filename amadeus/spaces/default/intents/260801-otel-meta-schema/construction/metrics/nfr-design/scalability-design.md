# Scalability Design — U5 metrics

上流入力(consumes 全数): scalability-requirements ほか performance-requirements / security-requirements / reliability-requirements / tech-stack-decisions は nfr-requirements SKIP により不在(expected)— スケーラビリティ面は requirements.md NFR-2(中立境界 — 配布面スケール)から代替導出。business-logic-model.md(実在)の低 cardinality 統制を消費。tech-stack 前提は codekb technology-stack.md 260801 現在節に依拠。

## スケール軸

- **時系列数**: 計器5種 × 低 cardinality 語彙の積で上界 — intent 数・レコード数に比例して時系列が増えない(cardinality 統制がそのままスケーラビリティ統制)
- **並行プロセス**: meter はプロセスローカル集計+プロセス終了時 flush — 共有状態ゼロ、store への追記は既存 writer 経路(append)で衝突しない
- **配布面**: core 1定義から7ハーネス dist へ機械投影(NFR-2)— ハーネス別の計器実装分岐を作らない

## store 容量

- metric レコードは per-record 埋め込みで store(metrics-)へ追記され、容量はプロセス起動数×計器数に線形(U1 nfr-design の per-record 実測と同一構造)。1プロセスの寄与は計器5種の集計行のみで定数上界

## 非適用(nfr-design:c1)

auto-scaling・load balancing・sharding は非適用 — 常駐 collector を持たないローカル JSONL 構造のため。
