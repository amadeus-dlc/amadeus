# Domain Entities — U2 perf-workflow

上流入力(consumes 全数): unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md

エンティティ集合は unit-of-work.md U2 の内容列挙(cron・jobs 3面・timeout・STEP_SUMMARY・artifact・ヘッダ文書化)と requirements.md FR-2a〜2e の要求要素を 1:1 で写像したもの。unit-of-work-story-map.md ジャーニー2 の「drift 観測」体験は artifact 行が担う。

## エンティティ(workflow 構成要素)

| エンティティ | 値 | 出典 |
|---|---|---|
| workflow ファイル | `.github/workflows/perf.yml`(新設) | components.md C-3 |
| cron 式 | `47 17 * * *` | decisions.md ADR-5(components.md C-3 経由) |
| job 集合 | perf-tests / distribution-benchmark(matrix 1-3)/ distribution-benchmark-aggregate | component-methods.md C-3 表 |
| timeout 集合 | 25 / 5 / 5(min) | component-methods.md C-3(実測導出) |
| artifact 名 | `amadeus-perf-test-size-report`、`mirror-distribution-benchmark-<n>`(既存名維持) | services.md 観測継続節 / ci.yml :251 |
| concurrency group | `perf`(cancel-in-progress: false) | components.md C-3(metrics-maintenance 既習様式) |

## 移植元との対応(diff 対象)

- 新設: `.github/workflows/perf.yml` のみ(本 Unit は1ファイル追加で完結 — ci.yml・tests/ 無接触)
- 移植元参照: ci.yml :224-253(benchmark)、:255-277(aggregate)— U3 で削除されるまで両所に共存(重複実行は一時的・意図的: 受け皿検証期間。services.md の実行面表では U2 着地後〜U3 着地前だけ benchmark が blocking(ci.yml)と非 blocking(perf.yml)の両行に現れる)

## 不変条件

- perf.yml は書込系権限を要求しない(permissions 既定 — contents: read 相当)
- スクリプト実体(scripts/mirror-distribution-benchmark*.ts)は無変更(V-4 の検証述語5面を保存)
