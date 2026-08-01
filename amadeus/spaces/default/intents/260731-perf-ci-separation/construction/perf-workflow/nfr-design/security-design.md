# Security Design — U2 perf-workflow

上流入力(consumes 全数): business-logic-model.md(U2 FD)。nfr-requirements 5成果物は本 scope で同ステージ SKIP のため設計上不存在(consumes_absent expected:true)— requirements.md の NFR-2/FR-2 と実測(job 3断面 0.2-0.3min、per-test 上限総和)を一次根拠に具体化する。

測定 ref = observed `da51af375`。

## 権限設計

- perf.yml は読取のみ(checkout+テスト実行)— 新規 secrets / GitHub App token を導入しない(business-logic-model.md ロジック2 の step 列に書込系なし。既定 GITHUB_TOKEN の最小権限)
- 外部送信なし(artifact upload は GitHub 内)

## サプライチェーン

- action は既存ピン版のみ(checkout@v4 / setup-bun@v2 / upload-artifact@v4 — ci.yml と同版)。新規 action を導入しない
