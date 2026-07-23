# Performance Requirements — boundary-guard

> 上流入力(consumes 全数): business-logic-model、business-rules、requirements、technology-stack(本文で参照)

## 性能要件

- 本 Unit(境界ガードテスト)の性能面は「既存 CI 予算内での実行」のみ: business-rules BR-6 の corpus sweep は配布ツリー全域走査だが、既存 drift guard 群(dist:check 系 — technology-stack の現行スタック表どおり Bun 直接実行)と同オーダーのファイル走査であり、専用の性能目標値は設けない(requirements NFR-1 の既存 CI green 維持に包含 — 新規の service SLO は存在しない: observability-setup:c3 の既決に従い timeout を SLO へ昇格させない)

## 検証

- tests/run-tests.sh --ci のランナー出力(wall-clock 行)を導入前後で機械比較し、増分を record に転記する(閾値の新設はしない — 数値は集計コマンド出力からの転記のみ。business-logic-model の unit/integration 層分割により重い走査は integration 層1回のみ)

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-23T03:46:06Z
- **Iteration:** 1
- **Scope decision:** none

Critical2(scalability/reliability のヘッダー装飾トークン化)+Major3(regex-linearity 誤引用・誤適用/security・tech-stack の参照欠落)+Minor1(目視検証)。conductor の総当たりチェックがヘッダー自身にマッチして空文化していた実装欠陥も判明

### Findings

- Critical1/2: scalability・reliability の本文に business-logic-model/requirements 等の実参照を追加
- Major3: regex-linearity の出典を team.md へ訂正し、述語1は substring 探索(非 regex)実装を明記して線形性懸念を構造回避
- Major4/5: security の technology-stack 参照・tech-stack の business-rules 参照を本文へ
- Minor6: 性能検証を CI wall-clock の機械比較へ

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-23T03:48:12Z
- **Iteration:** 2
- **Scope decision:** none

iter1 の6指摘全閉包(実参照化・regex-linearity 出典訂正+substring 設計決定・機械検証化)。是正 diff に捏造なし、FD との整合確認

### Findings

- None
