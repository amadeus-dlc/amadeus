# Unit of Work — 260807-merged-pr-convergence

上流入力(consumes 全数): `requirements`(FR-1〜FR-5 の全数を単一 Unit の外延として消費)、`components`(変更対象4コンポーネント+文書面)、`component-methods`(メソッド契約とテスト対応表)、`services`(外部境界の不変性)、`component-dependency`(依存方向の不変性)、`decisions`(ADR-1〜4)。

## Unit 定義

| Unit | kind | 内容 | 規模見積り |
|---|---|---|---|
| landed-report | service | FR-1〜FR-5 の全実装: gh-runner クエリ拡張 + predicate PrLifecycleState/verdict + cli landed 分岐/variant/render + sensor kind 拡張 + stage 文書/docs + テスト(t481/t482 新規、t446/t448/t450 追補) | 実装 +100〜170 行(gh-runner/predicate/cli/sensor の4面)+ 文書 +30〜60 行 / テスト +150〜250 行(decisions.md の面別見積りと1:1) |

## 単一 Unit の正当化(cid:units-generation:c1 (a) の検証)

- **1 Issue = 1 Unit 原則**(#2401 のみ)。
- **分割不能境界の実測**: 「landed の書き手(cli renderReport)」と「読み手(sensor checkLanded)」は write⇔check の対で、片側だけでは利用者価値(guard を通る report + 偽装検出)を出荷できない — 検出と記録の対は単一 Unit へ統合する(c1 (a) の定型)。gh-runner/predicate の観測拡張も landed 分岐の必須入力で独立出荷の意味を持たない。
- 並行化の実益なし(全変更面が同一 plugin + 1 sensor に凝集し、ファイル交差 100%)。

## Bolt 対応

単一 Bolt(walking-skeleton 兼務 — self-feature Mandated により Bolt 1 は gated)。Bolt 粒度の確定は delivery-planning。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-07T11:06:49Z
- **Iteration:** 1
- **Scope decision:** none

単一 Unit 編成の正当化・YAML edge block 正書式・FR/AC 全数被覆・AD との型/依存整合をすべて確認。規模見積りの内訳表記齟齬(NIT 1)のみでブロッカーなし。

### Findings

- NIT | unit-of-work.md:9: 実装見積り +100〜170 は docs 分(+30〜60)を除外した4面合算 — 全面合算と読める注記と食い違い、docs 分を併記
- FOLLOW-UP | FR-5 に AC が無いのは requirements 側仕様どおり(構造的欠落ではない)— 記録のみ
