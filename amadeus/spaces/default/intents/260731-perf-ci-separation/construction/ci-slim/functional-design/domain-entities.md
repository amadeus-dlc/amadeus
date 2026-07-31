# Domain Entities — U3 ci-slim

上流入力(consumes 全数): unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md

エンティティ集合は unit-of-work.md U3 の内容(3 job 削除)と requirements.md FR-3 の対象を 1:1 で写像。unit-of-work-story-map.md ジャーニー1 の「PR CI 待ち時間」削減はこの削除リストが直接担う。

## エンティティ(削除・不変の台帳)

| 区分 | 対象 | 出典 |
|---|---|---|
| 削除 | job `distribution-benchmark`(:224-253) | components.md C-4 |
| 削除 | job `distribution-benchmark-aggregate`(:255-277) | components.md C-4 |
| 削除 | job `distribution-release-gate`(:279-291) | components.md C-4(ADR-4) |
| 不変 | `ci-success` needs 8項 | component-methods.md C-4(RE 実測: 削除3 job は needs 非掲載) |
| 不変 | `distribution-contract` | services.md 実行面表(blocking 継続) |
| 不変 | `tests` / `coverage-head` / `coverage-base` | requirements.md FR-3c |

## 不変条件

- diff は削除のみ(追加行ゼロが理想。yml 構文上の隣接調整のみ許容)
- U2 の perf.yml が main に実在してから着地(BR-U3-3 — 二重実行窓の終了 = domain 上は「benchmark 実行面が blocking 側から非 blocking 側へ一意化」)
