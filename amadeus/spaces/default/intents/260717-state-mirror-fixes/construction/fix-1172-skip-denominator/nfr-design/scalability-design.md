# Scalability Design — fix-1172-skip-denominator(nfr-design)

上流入力(consumes 全数): performance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.md

## 設計(SC-1 の実現)

scalability-requirements.md SC-1 のとおり線形走査を維持。分母ロジックは1関数に閉じたまま(First-Class Collection 化はしない — 消費2箇所・不変条件1個の現規模でラッパー型が正しさを変えないため、business-logic-model の判定マトリクスを正本とする)。

## 非目標

分散・キャッシュ・事前集計は導入しない(N/A 宣言の設計維持)。
