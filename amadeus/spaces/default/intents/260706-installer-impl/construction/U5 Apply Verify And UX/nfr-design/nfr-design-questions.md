# NFR Design Questions — U5 Apply Verify And UX

> Stage: construction / nfr-design  
> Unit: U5 Apply Verify And UX

## Questions

### Q1. U5で追加のNFR設計判断が必要か

[Answer]: No additional questions. U5のNFR RequirementsとFunctional Designで、pre-apply rendering、prompt suppression、ordered apply、backup-before-copy、atomic manifest write、post-apply verification、classified reporting が固定済みであるため、追加のユーザー判断は不要。

## Ambiguity Analysis

曖昧な回答はない。U5は承認済み `FileOperationPlan` の表示・確認・適用・manifest write・verification・final reportを所有し、version resolution、target detection、planning policy recomputation、release publish、CI dispatch は所有しない。

矛盾はない。`performance-requirements.md` は plan render、ordered apply、atomic manifest write、verification のbudgetを要求し、`security-requirements.md` は no-write mutation prevention と policy recalculation禁止を要求し、`scalability-requirements.md` は single-target sequential apply を要求し、`reliability-requirements.md` は partial apply / manifest failure / verification failure の分類を要求している。`tech-stack-decisions.md` と `business-logic-model.md` は Bun/TypeScript、adapter boundaries、Application Service sequencing を定義しており、設計方針と一致する。

不足情報はない。実装時の詳細は、fake port fault injection、temp directory integration tests、reporter snapshots、atomic manifest fixture、verification check names として code-generation / build-and-test で具体化する。

## Upstream Coverage

- `performance-requirements.md`: render/apply/manifest/verification/no-write report budgets を確認した。
- `security-requirements.md`: no-write mutation prevention、backup durability、prompt suppression、manifest sequencing、report data minimization を確認した。
- `scalability-requirements.md`: 2,000 operations、500 backups、50 MiB copy、single-harness/target constraints を確認した。
- `reliability-requirements.md`: no-write、declined confirmation、partial apply、manifest-write-failed、verification failure、success report を確認した。
- `tech-stack-decisions.md`: Bun-first TypeScript、FileSystemPort、PromptPort、Reporter、atomic manifest adapter、no rollback を確認した。
- `business-logic-model.md`: Apply、Manifest、Verification、Reporter、Prompt workflows と integration boundaries を確認した。
