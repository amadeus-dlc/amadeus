# Business Rules — unit docs-norms

- R-1(FR-14): stage-protocol.md の記述は実装挙動と一致すること — mode 別マトリクス(none/semi/full × 確認ポイント)での照合を検査とする
- R-2(Q16): ノルム 3 レイヤーの改定は本 intent の変更列に含める(改定案の record 起草。ノルム PR は persist 規律に従い単独ブランチ)
- R-3: RFC-0001 frontmatter の tracking-issue に #3116 を記入(1 行変更)
- R-4(P2): 文書は実装から導出し、未実装の挙動を先行記述しない(先行記述は検証劇場の文書版)
- 落ちる実証: R-1 のマトリクス照合が不一致を検出できること(意図的に 1 セル改変した文書で照合が赤くなる)を 1 回実測

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-15T18:01:25Z
- **Iteration:** 1
- **Scope decision:** none

docs-norms は FR-14/Q16 を機械適用し、ノルムPRの独立発行(team.md 保守則)を正しく尊重、実装→文書の一方向同期のみを主張。(fd-rev-d verdict の kind-aware primary への再永続化 — 内容は当該レビュー時点から無変更)

### Findings

- NIT | domain-entities.md | mode別マトリクスの突合責任分界が薄い — code-generation 段で明確化を推奨
