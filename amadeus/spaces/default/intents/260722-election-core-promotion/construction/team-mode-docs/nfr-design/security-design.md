# Security Design — team-mode-docs

> 上流入力(consumes 全数): performance-requirements、security-requirements、scalability-requirements、reliability-requirements、tech-stack-decisions、business-logic-model(本文で参照)

## 設計

- security-requirements の「公式 URL 3種のみ・秘密情報なし」を実装形に固定: Prerequisites 節(business-logic-model の章2)の外部リンクは herdr.dev / agmsg 公式 / bun.sh の3つに限定し、PR レビュー観点へ「非公式 URL・短縮 URL の混入なし」を明記
- パス記載は {{HARNESS_DIR}} トークン形の公開配布パスのみ(tech-stack-decisions の既存 docs 体系)

## 検証設計

- security-requirements の N/A(追加検査なし)+URL 公式性の PR レビュー観点。reliability-requirements の grep ガードが旧パス(内部構造の露出)も同時に排除

## 他 NFR との整合

- scalability-requirements の固定文書集合により URL 検査対象も有界。performance-requirements の静的文書のみ方針と同根
