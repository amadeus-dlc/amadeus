# Inception Phase Guardrails

これらのルールは、`phase: inception` を宣言するすべてのステージに、対応するフェーズルールとしてインポートされ適用される。

## Requirements Quality

- 要件はテスト可能かつ検証可能でなければならない — 各要件に明確な合否基準を設ける
- 曖昧な表現(「速い」「簡単」「使いやすい」)は、測定可能な閾値と対にしない限り避ける
- 要件間の未解決の矛盾を持ち越さない。明示的に表面化させ解決する

## Architecture Standards

- アーキテクチャ決定にはトレードオフ分析を必須とする — 検討した代替案を最低2つ文書化する
- すべての ADR に含める: Context、Decision、Consequences、Alternatives Rejected
- 主要なアーキテクチャ決定ごとに、セキュリティとコンプライアンスへの影響を扱う

## User Stories

- ユーザーストーリーの受け入れ基準は Given/When/Then(BDD)形式に従う
- 各ストーリーはアクター、アクション、ビジネス価値を特定する
- ストーリーは独立してテスト可能にする — 順序の中でしか意味を持たないストーリーを避ける

## Traceability

- すべての要件は ideation の成果物(intent、feasibility、scope)まで遡れなければならない
- inception で新しい要件を導入する場合は、必ずその由来を文書化する

## Corrections
