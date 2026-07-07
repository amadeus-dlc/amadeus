# Services

## Upstream Trace

この intent は runtime service を追加しない。`requirements`、`architecture`、`component-inventory`、`team-practices` の内容から、service 相当の設計単位を repository-local workflow service として扱う。

## Service-Like Workflow Definitions

| Workflow service | Responsibility | Lifecycle | Scaling / Deployment |
| --- | --- | --- | --- |
| Layout Decision Workflow | 候補比較、ADR/設計記録、migration/no-migration rationale を作る | Inception artifact として完結 | runtime deploy なし |
| Packaging Workflow | root source から `dist/<harness>` を生成し drift を検査する | contributor/CI 実行 | `bun scripts/package.ts` と CI job |
| Self-Promotion Workflow | generated dist を repository root runtime dirs へ同期する | contributor/CI 実行 | `bun scripts/promote-self.ts` と CI job |
| Documentation Workflow | chosen layout を README/docs/contributing guide へ反映する | design 後の delivery slice | docs review と tests |
| Setup Package Coordination Workflow | `packages/setup` intent との境界を確認する | parallel intent coordination | この intent では実装しない |

## Orchestration Pattern

推奨 orchestration は design-first である。

1. Requirements が layout decision の合否基準を固定する。
2. Application Design が候補比較と推奨 decision を記録する。
3. Units Generation が docs/ADR/update/check を独立 slice に分ける。
4. Delivery Planning が drift guard を壊さない順序へ並べる。
5. Construction は必要になった場合のみ、source root abstraction などの小さい safe slice から始める。

この pattern は `team-practices` の「実装を急がず、CodeKB、要求、ADR/設計記録の順に根拠を積む」方針に従う。

## Communication Contracts

サービス間通信は存在しない。代わりに repository-local artifact contract を使う。

- Design artifacts: `requirements`, `components`, `component-methods`, `services`, `component-dependency`, `decisions`
- Validation commands: `bun run dist:check`, `bun run promote:self:check`, `bun run typecheck`, `bun run lint`, relevant `tests/run-tests.sh`
- Documentation outputs: ADR または design record, README/docs update plan

## Lifecycle Characteristics

本設計は runtime deploy や scaling を扱わない。重要な lifecycle property は reversibility と drift-guard continuity である。full normalization を将来選ぶ場合も、first slice は behavior-preserving でなければならない。
