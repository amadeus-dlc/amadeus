# Functional Design Questions — u001-harness-codex

## 上流入力

[requirements.md](../../../inception/requirements-analysis/requirements.md)、[unit-of-work.md](../../../inception/units-generation/unit-of-work.md)、[unit-of-work-story-map.md](../../../inception/units-generation/unit-of-work-story-map.md)。

設計の大枠は feasibility（Q1〜Q6）・scope（Q1〜Q2）・requirements（Q1〜Q2）で確定済み。実装細部 2 問を自己判断（理由付き）で確定し、gate の人間承認で確定する。

## Q1. 写像の実装方法（FR-2）

- A. parity-map の skillNameMapping（prefix 規則: aidlc-<x> → amadeus-<x>）を fresh clone の実在 skill 一覧へ機械適用し、当方 skills/ の実在と突き合わせて写像表を生成する（両側実在の交差 = 取り込み対象）
- B. 手書きで 38 行の表を書く
- C. その他
- X. Other (please specify)

[Answer]: A（prefix 規則の機械適用 + 両側実在の交差）。skillNameMapping の実測（prefix 規則 3 フィールド）に基づき、手書き表の転記ミスを排除する。交差から漏れた上流 skill（amadeus 側に不在）と当方独自 skill（上流に不在）は対象外として表に明記（FR-2.2）。自己判断（理由付き）。

## Q2. provenance コメントの形式（FR-3.2）

- A. YAML コメント 4 行固定: 「# Adapted from awslabs/aidlc-workflows dist/codex/.agents/skills/<上流 skill>/agents/openai.yaml」「# Upstream baseline: b67798c3」「# Mapping: <上流名> -> <amadeus 名>（skillNameMapping prefix 規則）」「# Guard: prevents implicit skill invocation on Codex（詳細は harness/codex/README.md）」
- B. 1 行の短縮形
- C. その他
- X. Other (please specify)

[Answer]: A（4 行固定）。requirements Q1 = A（二重記録）の yaml 側を満たす最小の定型で、全ファイル同型のため diff レビューが容易。自己判断（理由付き）。
