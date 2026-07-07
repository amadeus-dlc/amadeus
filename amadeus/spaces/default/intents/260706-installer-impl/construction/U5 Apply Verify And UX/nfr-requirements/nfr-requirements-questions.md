# NFR Requirements Questions — U5 Apply Verify And UX

> Stage: construction / nfr-requirements  
> Unit: U5 Apply Verify And UX  
> Upstream: `business-logic-model.md`, `business-rules.md`, `requirements.md`, `technology-stack.md`

## Decision

U5 では追加の人間質問を実施しない。

## Rationale

- `business-logic-model.md` が apply、manifest write、verification、reporter、prompt の責務境界を定義している。
- `business-rules.md` が no-write、backup-before-copy、manifest write sequencing、verification、reporting のテスト可能な不変条件を定義している。
- `requirements.md` の FR-008、FR-009、FR-010、FR-011、FR-013、FR-014、NFR-002、NFR-003、NFR-004、NFR-006 が U5 の品質要求を固定している。
- `technology-stack.md` が Bun/TypeScript と CI baseline を固定している。

## Resolved Questions

| Question | Answer |
|---|---|
| Should U5 recalculate safety policy before writes? | No. U5 consumes the approved `FileOperationPlan` from U4 and does not recalculate planning policy. |
| Should rollback be required for the first release? | No. Rollback restore workflow is out of scope. U5 must preserve backups and report partial apply diagnostics instead. |
| Should manifest write happen before file copy? | No. Manifest write starts only after `ApplyResult.ok === true`. |
| Should verification failure imply files were not applied? | No. Verification failure exits non-zero and reports failed checks, while preserving applied-operation diagnostics. |
| Should prompts run in `--yes` or non-TTY mode? | No. Prompt Adapter is not called when prompts are disallowed. |

