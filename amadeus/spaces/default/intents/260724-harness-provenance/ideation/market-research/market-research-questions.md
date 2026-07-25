# Market Research Questions — 260724-harness-provenance

上流入力(consumes 全数): intent-statement.md

本ステージの frontmatter `condition` は「Execute when initiative has external market positioning or build-vs-buy considerations. Skip for internal tools, bug fixes, or refactors.」と明記する。本 intent(intent-statement.md 記載どおり、Amadeus 自身のステージ記録スキーマへの内部拡張)は「internal tools」に該当し、外部市場向けポジショニングを持たない。selection-answer-after-ruling の対象となる価値判断は存在せず(既決 contract の condition テキストをそのまま適用する機械的執行)、以下は N/A 判定とその根拠を機械回答として記録する。

**選挙不要判定(cid:requirements-analysis:no-election-judgment-gate)**: Q1-Q7 はいずれも本ステージ frontmatter の `condition` 文言の機械的適用のみで、新規の価値判断を含まない。選挙不要と判断し、leader へ申告のうえ承認を得た。承認: leader が承認しました(2026-07-24T11:06:17Z)。

## Q1. どんな競合製品・ソリューションが市場に存在するか?

[Answer]: A

- A. N/A — 本機能は Amadeus 自身の内部記録スキーマ(amadeus-state.md / stage memory.md)への拡張であり、外部市場に競合する製品カテゴリが存在しない
- X. Other

## Q2. それらの強み・弱み・価格モデルは?

[Answer]: A

- A. N/A(Q1 と同じ根拠 — 対象市場が存在しない)
- X. Other

## Q3. 関連する業界トレンドや規制動向は?

[Answer]: A

- A. N/A。強いて言えば「AI ハーネスの多様化(claude-code/codex/cursor/opencode/kiro)」自体が Amadeus 固有の運用文脈であり、外部業界トレンドではない
- X. Other

## Q4. 顧客が当然視する機能(table-stakes)と差別化要因は?

[Answer]: A

- A. N/A(内部ツールであり顧客セグメントを持たない)
- X. Other

## Q5. 内部イニシアチブの場合、既存ツール・SaaS製品・OSS代替はあるか?

[Answer]: A

- A. 既存の git commit メタデータ(author)や CI ログでハーネス種別を代替記録する案を検討したが、git commit author は常に人間の git identity であり、AI ハーネス種別を運べない(Issue #1452 本文で既に確認済み)。汎用の「AI エージェント実行証跡」SaaS/OSS は把握していない — feasibility ステージで実測確認する
- X. Other

## Q6. build-vs-buy-vs-partner の計算は?

[Answer]: A

- A. Build 一択。Amadeus 固有の内部記録スキーマ(amadeus-state.md、stage memory.md、監査シャード)への数十行規模のフィールド追加であり、外部ベンダー・OSS 採用に見合う規模・汎用性を持たない
- X. Other

## Q7. 対象とする市場規模・アドレサブルオーディエンスは?

[Answer]: A

- A. N/A(社内ツール、外部市場を対象としない)
- X. Other
