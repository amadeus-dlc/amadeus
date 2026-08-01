# Reliability Design — U2 perf-workflow

上流入力(consumes 全数): business-logic-model.md(U2 FD)。nfr-requirements 5成果物は本 scope で同ステージ SKIP のため設計上不存在(consumes_absent expected:true)— requirements.md の NFR-2/FR-2 と実測(job 3断面 0.2-0.3min、per-test 上限総和)を一次根拠に具体化する。

測定 ref = observed `da51af375`。

## 失敗の可視化と回復(FR-2d)

- 失敗は workflow 赤+STEP_SUMMARY 要約(business-logic-model.md ロジック3)。自動起票なし(Q3=B)— 対応はユーザー判断
- concurrency group perf / cancel-in-progress false — 日次実行と手動 dispatch の重なりでも実行を破棄しない(結果の欠測防止)
- schedule の 60日 suspend(GitHub 仕様)はヘッダ文書化(R-3)— 無音停止のリスクを既知化

## 検証結果の保全

- test-size-report artifact(retention 14日)で drift 観測を継続(V-8 の受け皿)
- benchmark artifact 名は ci.yml と同一 — 消費側(aggregate)の互換を保存
