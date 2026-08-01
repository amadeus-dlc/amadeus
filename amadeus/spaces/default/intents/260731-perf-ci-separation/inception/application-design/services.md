# Services — 260731-perf-ci-separation

上流入力(consumes 全数): requirements.md、architecture.md、component-inventory.md、stories(N/A — user-stories は本 scope(self-feature)の EXECUTE 集合で SKIP のため成果物不存在。ユーザー価値の導出は intent-statement 経由で requirements.md に固定済み)、team-practices(N/A — practices-discovery SKIP のため不存在。プラクティスは memory 層が ambient 適用 — requirements.md line 3 と同判断)

本 intent は常駐サービスを持たない(CLI ランナーと GitHub Actions workflow のみ — cid:nfr-design:c1 の CLI/library 姿勢)。「サービス」に相当する実行面を列挙する。

## 実行面

| 実行面 | トリガー | blocking | 責務 |
|---|---|---|---|
| ci.yml `tests`/`coverage-*` | PR / push | ✅(ci-success 経由) | 決定的検証(smoke+unit+integration、perf 除外後) |
| ci.yml `distribution-contract` | PR / push | ✅ | mirror 配布の契約検証(不変) |
| perf.yml `perf-tests` | daily cron + dispatch | ❌ | bun test perf tier(t257/t258/t259/t269/t292/t-plugin 由来の実時間契約) |
| perf.yml `distribution-benchmark(+aggregate)` | daily cron + dispatch | ❌ | mirror 配布ベンチ(3 replicas、p95/RSS/dispersion 予算) |

## 失敗時挙動(FR-2d)

perf.yml の失敗は workflow 失敗として GitHub UI に赤表示+STEP_SUMMARY に要約。自動起票なし(Q3=B)。対応はユーザー判断で intent 起動(business-overview.md の運用フローに整合)。

## 観測継続(R-2)

perf.yml は `tests/logs/test-size-report.json` を artifact `amadeus-perf-test-size-report` として保存(retention 14日 — ci.yml の既習値)。drift 実測の観測が blocking 面から perf 面へ引き継がれる。
