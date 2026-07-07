# NFR Requirements Questions — U6 Installer Test Harness

> Stage: construction / nfr-requirements  
> Unit: U6 Installer Test Harness  
> Upstream: `business-logic-model.md`, `business-rules.md`, `requirements.md`, `technology-stack.md`

## Decision

U6 では追加の人間質問を実施しない。

## Rationale

- `business-logic-model.md` が deterministic tests、fake ports、temp targets、source fixtures、coverage registry の責務を定義している。
- `business-rules.md` が required test matrix、no-live-network、no-real-project-mutation、coverage registry/ratchet を定義している。
- `requirements.md` の FR-001〜FR-016、NFR-001〜NFR-006 がテスト対象と品質床を固定している。
- `technology-stack.md` が Bun/TypeScript、existing CI command、Bun 1.3.13 baseline を固定している。

## Resolved Questions

| Question | Answer |
|---|---|
| Should tests call live GitHub? | No. U6 uses fake tag/archive sources and local fixtures. |
| Should tests mutate a real user project? | No. U6 uses isolated temporary targets only. |
| Should line coverage percentage be the primary gate? | No. Requirement/story coverage registry and ratchet are the quality floor. |
| Should snapshots contain absolute host paths? | No. Host paths are normalized except explicit examples. |
| Should release publish credentials be required for U6? | No. npm credentials belong to U8 release workflow, not deterministic installer tests. |

