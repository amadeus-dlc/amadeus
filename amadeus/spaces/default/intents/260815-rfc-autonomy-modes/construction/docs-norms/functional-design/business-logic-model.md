# Business Logic Model — unit docs-norms

- 入力: 着地済み実装(U1〜U11)の実挙動 + 各裁定(選挙・ADR・Q6/Q9)
- 処理: (1) stage-protocol.md の autonomy 記述(:131,:135,:137,:139-152,:286,:1064-1075,:1224-1236 — RFC frontmatter 列挙の該当節)を新意味論へ書換 (2) memory org/team/project の autonomy 該当ノルム改定案を作成(ノルム変更は persist ごとに単独ブランチ PR — team.md 保守則に従い、本 unit は改定「案」を record に置き、ノルム PR は独立に発行) (3) RFC frontmatter へ tracking-issue #3116 を記入 (4) 文書と実装の mode 別マトリクス照合(文書検査)
- 出力: 文書差分(実装 PR 群と同一 intent 内)+ 照合結果
- エラー経路: 文書と実装の不一致検出 → 実装側が裁定準拠なら文書を直す。裁定と実装の不一致なら設計逸脱として停止(P3)

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-15T17:28:56Z
- **Iteration:** 1
- **Scope decision:** none

docs-norms は FR-14/Q16 を機械適用し、ノルムPRの独立発行(team.md 保守則)を正しく尊重、実装→文書の一方向同期のみを主張。

### Findings

- NIT | domain-entities.md | mode別マトリクスの突合責任分界が薄い — code-generation 段で明確化を推奨
