# 性能設計 — U1 harness-capability-matrix

> 上流入力(consumes 全数): performance-requirements、security-requirements、scalability-requirements、reliability-requirements、business-logic-model、tech-stack-decisions
> 技術前提(Bun 単独・runtime dependency 追加ゼロ・新規外部依存なし)は同 unit の tech-stack-decisions の決定を継承する。

## N/A 継承(稼働時性能)

performance-requirements「適用可否(N/A の判定)」のとおり、U1 は稼働時に実行されるサービスコードを持たない文書+プローブ Unit であり、性能設計は **N/A を継承** する(理由は performance-requirements の参照で足りる)。scalability-requirements の N/A 判定(稼働体不在)とも整合し、cache・水平スケール等の常駐 service 向けパターンは設計に持ち込まない。

- NFR-2(起動レイテンシ非退行)の設計責務は U2 walking-skeleton-claude の performance-design が負う(performance-requirements の配賦どおり)。U1 側に対応する設計要素はない

## プローブ作業の時間非拘束の設計上の帰結

performance-requirements「プローブ所要時間の扱い」のとおり、business-logic-model のプローブ 5 ステップ(面の列挙 → 一次資料直読 → 実測プローブ → クラス割当 → degrade 契約起草)は一度きりの実測作業で時間予算を持たない。設計上の帰結として、ProbeRecord 様式に所要時間・タイムスタンプの必須フィールドを **設けない**(記録するのは reliability-design が定める決定性フィールドのみ)。時間計測フィールドの不在は、security-requirements の非破壊性検証(command verbatim の grep 走査)と reliability-requirements の再現性検証を軽量に保つ意図的な省略であり、欠落ではない。

- 合否対応: performance-requirements は性能の受け入れ基準を設けない(N/A)。本設計もこれに対応する検証項目を追加しない

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-26T17:21:13Z
- **Iteration:** 1
- **Scope decision:** none

consumes 6 点実参照・N/A 継承妥当・層別保証・早期断定なし・ADR-4 literal 逐語一致。findings 0。

### Findings

- None
