# Logical Components — U2 perf-workflow

上流入力(consumes 全数): business-logic-model.md(U2 FD)。nfr-requirements 5成果物は本 scope で同ステージ SKIP のため設計上不存在(consumes_absent expected:true)— requirements.md の NFR-2/FR-2 と実測(job 3断面 0.2-0.3min、per-test 上限総和)を一次根拠に具体化する。

測定 ref = observed `da51af375`。

## 論理構成(business-logic-model.md の3ロジックの写像)

| 論理コンポーネント | 実体 | 契約 |
|---|---|---|
| トリガー面 | schedule + workflow_dispatch | PR 非連動(BR-U2-1) |
| perf 実行面 | perf-tests job | --perf の全数実行、timeout 25 |
| benchmark 面 | distribution-benchmark ×3 + aggregate | ci.yml の step 列と機能等価(V-1〜V-4) |
| 可視化面 | STEP_SUMMARY + artifact | loud-fail 契約 |

## 境界

- ci.yml へ不介入(needs / branch protection 不変 — BR-U2-2)
- スクリプト実体(mirror-distribution-benchmark*.ts)無変更
