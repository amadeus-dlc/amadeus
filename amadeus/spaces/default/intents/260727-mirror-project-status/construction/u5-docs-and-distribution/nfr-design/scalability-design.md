# Scalability Design — u5-docs-and-distribution

上流入力(consumes 全数): performance-requirements, security-requirements, scalability-requirements, reliability-requirements, tech-stack-decisions, business-logic-model

scalability-requirements のとおり U5 の対象は固定集合 — 設計は集合の不変性の機械確認に閉じる。

## 固定集合の設計

- **配布面**: 7ハーネス+self-install の固定集合(business-logic-model の配布同期フロー — scalability-requirements)。集合の全数照合は既存 drift guard(reliability-requirements の機械検査)が担い、U5 で新しい列挙・カウントを作らない(tech-stack-decisions の新機構ゼロ)。
- **docs**: 既存4文書体系への追記のみで文書数不変(business-logic-model — 新文書を増やさない)。対訳ペア構造も不変。

## 規模の非適用

- 負荷スケーリング・キャッシュ等: N/A(scalability-requirements — U5 は静的成果物と検収のみ。performance-requirements のランタイム性能非所有と同根)。
- 検収の規模はテストスイート全体1回分(scalability-requirements)— 既存 CI 枠で完結し、母集団の変化(台帳不変検収 — security-requirements の検出器)だけを機械確認する。
