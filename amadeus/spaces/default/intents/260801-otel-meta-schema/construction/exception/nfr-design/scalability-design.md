# Scalability Design — U3 exception

上流入力(consumes 全数): scalability-requirements ほか performance-requirements / security-requirements / reliability-requirements / tech-stack-decisions は nfr-requirements SKIP により不在(expected)— スケーラビリティ面は requirements.md NFR-1(fail-open — 例外量の増加が emit を止めない)から代替導出。business-logic-model.md(実在)の recordException 拡張が既存 addEvent 経路(per-record 追記)へ載る構造を消費。tech-stack 前提は codekb technology-stack.md 260801 現在節に依拠。

## スケール特性

- exception イベントは span event として per-record 埋め込みで store へ追記される(既存 addEvent → local-span-exporter の 1 span = 1 JSONL 行構造 — U1 nfr-design の per-record 埋め込み実測と同一経路)。容量は例外発生数に線形、行あたり増分は stacktrace 長(redaction 後)で上界
- 共有状態ゼロ(redactStacktrace は純関数)— 並行プロセス・並行 span からの同時 recordException に対して線形にスケールし、ロック不要
- 水平/垂直スケーリング・sharding・queue 分離は非適用(nfr-design:c1 — 短命 CLI プロセスの library 層)

## 大型 stack への上界

- stacktrace は redaction 後の文字列をそのまま載せる(FD 契約 — 切詰めなし)。異常な深さの再帰 stack でも行単位1パス処理のため処理時間は線形(performance-design の線形性実測と対)。store 行サイズの統制が必要になった場合の切詰め導入は #1868 改訂(スキーマ正本経由)を要する将来判断として固定
