# Scalability Design — U2 perf-workflow

上流入力(consumes 全数): business-logic-model.md(U2 FD)。nfr-requirements 5成果物は本 scope で同ステージ SKIP のため設計上不存在(consumes_absent expected:true)— requirements.md の NFR-2/FR-2 と実測(job 3断面 0.2-0.3min、per-test 上限総和)を一次根拠に具体化する。

測定 ref = observed `da51af375`。

## スケール軸

- perf テスト増加 → perf-tests job の実行時間増。上限 25min(business-logic-model.md ロジック2)が loud な限界信号 — 超過時は timeout 失敗として可視化され、予算再導出(実測ベース)を促す
- benchmark replica 数(3)は現行踏襲 — 増設は aggregate の completeness 検査(3 replicas 要求)と同時に変更する対称対

## 非採用

matrix の動的拡張・self-hosted runner は導入しない(cid:nfr-design:c1 — 日次バッチに過剰)。
