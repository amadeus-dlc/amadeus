# Reliability Design — U4 Operation Planning And Safety

> Stage: construction / nfr-design  
> Unit: U4 Operation Planning And Safety

## Reliability Objectives

U4は every branch explainable な `FileOperationPlan` を返す。`reliability-requirements.md` の通り、planはU5がpolicy recalculationなしで実行できるか、precise no-write reasonでmutationを止めるかのどちらかでなければならない。

## Plan State Machine

| Plan state | Required fields | Meaning |
|---|---|---|
| executable | `canApply:true`, operations | U5 may apply after report and any required confirmation. |
| confirmation-gated | `canApply:true`, `requiresConfirmation:true`, `confirmationReason`, executable operations | Prompt decision後にU5 apply可能。 |
| no-write | `canApply:false`, `noWriteReason`, no executable mutation | U5 must not mutate. |

`conflict` operations は no-write plan の説明用であり、executable operationではない。confirmation-gated collision は `conflict` ではなく `backup` + `update` operations と `requiresConfirmation:true` で表す。

## Ordering Invariants

- `backup` は dependent `update` / `force-update` より前に置く。
- `user-preserved` は常に `skip`。
- changed/unknown shared file は backup なしで上書きしない。
- `--force` でも backup を省略しない。
- one operation timestamp を plan内のすべてのbackupに使う。
- backup collision suffix は `.1`, `.2` の順に決定する。
- source-copy operation、つまり `add` / `update` / `force-update` は `sourcePath` を持つ。`backup` は target-to-backup mutation のため `sourcePath` ではなく `backupPath` を持つ。

## Failure Handling

| Failure / policy branch | Stable reason code | Result |
|---|---|---|
| missing required harness in non-interactive | `missing-harness` | `canApply:false` |
| missing required target in non-interactive | `missing-target` | `canApply:false` |
| install collision without force and no prompt | `collision-force-required` | `canApply:false` with `conflict` operations |
| partial target without force | `partial-target-force-required` | `canApply:false` |
| downgrade request | `downgrade-unsupported` | `canApply:false` |
| already up-to-date | `already-up-to-date` | `canApply:false` |
| installed newer than latest default | `installed-newer-than-latest` | `canApply:false` |
| target `none` on upgrade | `target-not-installed-run-install` | `canApply:false` |
| target `unsupported-layout` | `unsupported-layout` | `canApply:false` |
| target `ambiguous-harness` unresolved | `ambiguous-harness` | `canApply:false` |
| malformed developer input | `planner-input-invalid` or thrown developer error | never unsafe `canApply:true` |

`partial` + `--force` は no-write ではなく conservative force planning に進む。この場合、U4は `manual-or-unknown` と同じく source metadata と target snapshot を使い、changed/unknown shared files には `backup` then `force-update` を生成する。`--force` は missing harness/target validation を補完しないため、必須値が欠けている場合は上記の `missing-harness` / `missing-target` が優先する。

## Portability Reliability

Backup timestamp は UTC basic `YYYYMMDDTHHMMSSZ` に固定し、filename unsafe な `:` を含めない。backup path は original relative path と同じ directory/basename を維持し、suffix は `<basename>.<timestamp>.bk` または `<basename>.<timestamp>.N.bk` とする。

operation paths は portable relative paths として扱い、platform filesystem path conversion はadapter boundaryに残す。paths with spaces は path split/string concat ではなく path-aware helperで扱う。

## Test Strategy

U6で以下をfixture化する。

- all target states;
- all file classes;
- install collision branches with/without `--force` and `--yes`;
- interactive confirmation branch;
- version equal/downgrade/installed-newer/newer target branches;
- unknown shared md5;
- backup-before-update ordering;
- one timestamp per plan;
- collision suffix ordering;
- source-copy operation `sourcePath` requirement and backup `backupPath` requirement;
- planner no filesystem/network/prompt dependency assertion.

## Upstream Coverage

- `performance-requirements.md`: reliability branchは pure planning benchmark と同じ入力で検証する。
- `security-requirements.md`: destructive-operation prevention と traceability をinvariants化した。
- `scalability-requirements.md`: target states/file classes の増加時はpolicy必須にする。
- `reliability-requirements.md`: no-write reason、confirmation reason、ordering、portability、diagnostics を直接設計した。
- `tech-stack-decisions.md`: pure functions、one timestamp、injected predicate、no live filesystem に従う。
- `business-logic-model.md`: decision tree、backup path workflow、output contract を reliability model に反映した。
