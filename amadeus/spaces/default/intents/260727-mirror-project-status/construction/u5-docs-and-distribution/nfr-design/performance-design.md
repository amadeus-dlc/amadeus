# Performance Design — u5-docs-and-distribution

上流入力(consumes 全数): performance-requirements, security-requirements, scalability-requirements, reliability-requirements, tech-stack-decisions, business-logic-model

performance-requirements のとおり U5 はランタイム性能要件を持たない — 設計の対象は「検証・再生成が既存枠内で完結する」ことのみ。

## 検証・再生成の実行構造

- 検収フロー(business-logic-model)は既存4層ランナー+coverage ゲートの1回実行(performance-requirements — 新しい長時間ジョブ・ベンチマークを追加しない。tech-stack-decisions の新検収基盤ゼロ決定)。
- dist 再生成は既存 `bun scripts/package.ts` / `bun run promote:self` の機械的実行(business-logic-model の配布同期フロー)— 生成時間の要件を置かない(performance-requirements)。対象は7ハーネス固定集合(scalability-requirements)。

## 非目標

- ランタイム性能・SLO: N/A(performance-requirements の N/A 規律 — U5 は実行コードを追加しない。性能要件の所有は U1〜U4 の各 NFR で、U5 は検収のみ)。docs 追記(security-requirements の秘匿契約に従う記述)・台帳同期(reliability-requirements の機械検査)に性能面の設計対象は存在しない。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-27T10:58:37Z
- **Iteration:** 1
- **Scope decision:** none

契約の過不足ない機構化・無引用導入なし・越境なし・N/A は requirements 接地で必須検査の省略根拠化なし・consumes 6件全実参照。指摘なし。

### Findings

- None
