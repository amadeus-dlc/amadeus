# Reliability Design — fix-1172-skip-denominator(nfr-design)

上流入力(consumes 全数): performance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.md

## 設計(R-1〜R-3 の実現)

| 要件 | 設計 |
|---|---|
| R-1 不正入力耐性 | 既存の match 不成立スキップを不変維持(新規例外経路ゼロ) |
| R-2 不変条件 approved<=total | 除外条件は total 減少方向のみ — unit テストで性質を assert |
| R-3 恒久検知 | t232 fixture を実様式へ是正(BR-4)+両様式ケース追加 — 語彙取り違えの再発を fixture 面で封鎖 |

## 失敗モード

なし(純関数 — 例外を投げない既存契約を維持)。
