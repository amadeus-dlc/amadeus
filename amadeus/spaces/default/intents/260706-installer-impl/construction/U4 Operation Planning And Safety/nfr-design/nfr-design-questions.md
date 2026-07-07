# NFR Design Questions — U4 Operation Planning And Safety

> Stage: construction / nfr-design  
> Unit: U4 Operation Planning And Safety

## Questions

### Q1. U4で追加のNFR設計判断が必要か

[Answer]: No additional questions. U4のNFR RequirementsとFunctional Designで、pure planner、no-write plan、backup-before-update、`--yes`/`--force` semantics、target state branches、operation plan contract が固定済みであるため、追加のユーザー判断は不要。

## Ambiguity Analysis

曖昧な回答はない。U4は `FileOperationPlan` を作る純粋な政策層であり、prompt、reporting、filesystem write、backup write、manifest write、post-apply verification は所有しない。

矛盾はない。`performance-requirements.md` は in-memory planning と O(n) / O(n log n) を要求し、`security-requirements.md` は destructive-operation prevention を要求し、`scalability-requirements.md` は no shared mutable planner state を要求し、`reliability-requirements.md` は deterministic explainable plan を要求している。`tech-stack-decisions.md` と `business-logic-model.md` は pure functions と injected `backupPathExists` predicate を定義しており、設計方針と一致する。

不足情報はない。実装時の詳細は、operation schema、backup path builder、version decision table、fixture matrix、ordering invariant tests として code-generation / build-and-test で具体化する。

## Upstream Coverage

- `performance-requirements.md`: pure planning benchmarks と no live filesystem constraints を確認した。
- `security-requirements.md`: `canApply:false`、backup-before-overwrite、force/yes limits、traceability を確認した。
- `scalability-requirements.md`: 2,000 files、500 backups、target states、file classes、parallel invocation constraints を確認した。
- `reliability-requirements.md`: deterministic plan、no-write reasons、confirmation reasons、sourcePath requirements を確認した。
- `tech-stack-decisions.md`: TypeScript/Bun、pure functions、injected backup predicate、one timestamp per plan を確認した。
- `business-logic-model.md`: install/upgrade planning workflow、backup path workflow、output contract、integration boundaries を確認した。
