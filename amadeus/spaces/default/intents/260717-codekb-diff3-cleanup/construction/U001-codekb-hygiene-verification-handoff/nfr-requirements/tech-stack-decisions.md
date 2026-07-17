# Tech Stack Decisions — U001 CodeKB hygiene verification handoff

上流入力(consumes全数): `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`。

## Decision Summary

`requirements.md` FR-3bと`business-logic-model.md` Design Boundaryに従い、新規technology、application module、dependency、database、AWS infrastructureは追加しない。`business-rules.md` のverification contractを、`technology-stack.md` に記録済みの既存stackとversion-controlled Markdownで実行・保存する。

| Concern | Selection | Rationale | Change |
|---|---|---|---|
| Source identity / ancestry | Git CLI / object graph | full SHA解決と`merge-base --is-ancestor`を既存機能で決定的に実行 | なし |
| Workflow runtime | Bun上の既存Amadeus TypeScript tools | state / audit / sensor / learning / reportをtool-ownedで処理 | なし |
| Evidence format | Markdown + exact SHA / count fields | repository reviewとaudit traceが可能 | record artifactのみ追加 |
| Content inspection | 既存local text scan | 固定2 pathの行頭語彙 / H2全数計数に十分 | dependency追加なし |
| Quality verification | 既存declared sensors、GitHub CI、独立review | current governanceとsegregation of dutiesを維持 | pipeline変更なし |
| Persistence | Git version control | immutable commit checkpointとpush SHAを保持 | database / object storeなし |

## Language and Framework Boundary

Repository基盤は`technology-stack.md` のTypeScript ESM、Bun、Git、`bun:test`、Biome、GitHub Actionsを維持する。ただし本unitはapplication / framework sourceを変更しないため、新しいTypeScript module、package、test framework、formatter configを生成しない。Markdown成果物にTS / JS snippetを含めず、linter / type-check sensorはpath filter上非該当とする。

## Rejected Additions

| Alternative | Decision | Reason |
|---|---|---|
| New verification service / daemon | Reject | 常駐workload、availability、operational ownershipを不要に増やす |
| Database / cache | Reject | evidenceはgit recordで足り、shared mutable stateを導入する理由がない |
| Cloud SDK / AWS resource | Reject | remote integrationとcredential面を増やし、Issue #1129 scopeを越える |
| New parser / regex dependency | Reject | 固定Markdown patternは既存text scanで検証可能 |
| New CI workflow / policy | Reject | 既存CI evidenceを利用し、本intentでpipeline変更を行わない |
| Blind cherry-pick / marker reapply | Reject | content cleanとancestryを混同し、既存本文を損なう可能性がある |

## Compatibility and Operational Constraints

- 現行branch / worktreeと既存Git CLIで再現可能であること。
- Bun / Amadeus toolのstate / audit ownershipを迂回しないこと。
- Machine-local cursor / scratch / selection fileをproduct artifactとしてcommitしないこと。
- `.codex/hooks.json`など本intent外の既存dirty changeをstageしないこと。
- PR操作、main merge、Issue close、force pushを本conductorから実行しないこと。
- External CI evidenceはhead SHAとともに記録し、別headへ流用しないこと。別fix面の[PR #1183](https://github.com/amadeus-dlc/amadeus/pull/1183)はcontextual blocker evidenceに限定し、U001の`PreLandingEvidence.ciVerdict`、landing / close eligibilityには使用しない。

## Validation

Tech stack decisionのpass条件は、新規dependency / package / application source / IaC / workflow変更が0件であり、全stage artifact、sensor、review、§13、gate、commit / pushを既存toolchainで完了できることである。Build and Testはrepository全体の既存checkと、本unit固有のexact evidence検査を分離して報告する。
