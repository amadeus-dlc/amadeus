# NFR Requirements Questions — U4 Operation Planning And Safety

> Stage: construction / nfr-requirements  
> Unit: U4 Operation Planning And Safety  
> Upstream: `business-logic-model.md`, `business-rules.md`, `requirements.md`, `technology-stack.md`

## Decision

追加の人間質問は実施しない。U4 の NFR は `requirements.md` の FR-005 / FR-006 / FR-008 / FR-009 / FR-010 / FR-011 / NFR-002 / NFR-003 / NFR-004、U4 functional design の `business-logic-model.md` / `business-rules.md`、reverse engineering の `technology-stack.md` で固定済みである。

## Fixed Answers

### Q1: U4 は filesystem を読むか

- [Answer]: A
- A. U4 は U3 の `TargetSnapshot` と injected `backupPathExists` predicate を使い、live filesystem を直接読まない。

### Q2: Conflict と confirmation の違い

- [Answer]: A
- A. `conflict` は no-write 専用。対話 confirmation は executable `backup` + `update` と `requiresConfirmation:true` で表現する。

### Q3: Safety quality floor

- [Answer]: A
- A. changed/unknown shared file では、`--force` でも confirmation-gated apply でも backup operation が dependent update/force-update より前にあることを必須にする。

## Ambiguity Analysis

曖昧さは残っていない。`business-logic-model.md` は planning inputs、install/upgrade workflow、backup path workflow、output contract を固定している。`business-rules.md` は `--yes`/`--force`、version-state no-write、target-state no-write、backup ordering、sourcePath を固定している。`requirements.md` は non-destructive shared-file policy、file-level report、non-interactive safety、portability、traceability を定義している。`technology-stack.md` は Bun/TypeScript と CI baseline を示している。

## Upstream Coverage

- `business-logic-model.md`: Planning Inputs、Install Planning Workflow、Upgrade Planning Workflow、Backup Path Workflow、Output Contract を NFR 対象にする。
- `business-rules.md`: BR-U4-001..028 と Testable Invariants を pass/fail 条件へ展開する。
- `requirements.md`: FR-005 / FR-006 / FR-008 / FR-009 / FR-010 / FR-011 / NFR-002 / NFR-003 / NFR-004 を U4 の品質属性へ割り当てる。
- `technology-stack.md`: TypeScript/ESM、Bun 1.3.13、CI command を tech-stack decision に反映する。
