# Performance Design — mirror-distribution-docs

> 上流入力: `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`

## Pipeline Budgets

| Path | Target |
|---|---:|
| 6-surface package | p95 ≤30秒、RSS ≤512 MiB |
| dist check | p95 ≤30秒、write 0 |
| 4 self-install projection | p95 ≤20秒 |
| JA/EN docs parity | p95 ≤2秒 |
| 22 payload digest matrix | p95 ≤2秒、RSS ≤128 MiB |

manifestは1回走査し、artifactを1件ずつdigestする。GitHub Actions固定image、warm-up 3＋20 run、nearest-rank p95の3 job中央値で判定する。

## Resource Control

公開projectionは64 MiB、1 file 2 MiB。timestamp、absolute path、machine newlineを生成しない。checkはshared lockとtemporary candidateだけを使いchecked-in outputを変更しない。

## Verification

PERF-DD-01〜05、write 0、deterministic double generationをbenchmark／digest fixtureで検証する。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-24T09:05:30Z
- **Iteration:** 1
- **Scope decision:** none

registry、file transaction、read-only check、scan、digest/docs parityは整合するが、crash lock回収、journal states、manifest completeness、reader snapshot boundaryが不足。

### Findings

- [Critical] mkdir lockのowner identity、reader registration、stale判定、安全reclaim、journal優先規則がない。
- [Critical] prepared→committing→committed→cleaned journal stateとfsync、正常cleanup、crash判定がない。
- [Major] manifestがwrapper/registration/docs/golden/scan policyを列挙できない。
- [Major] validatorsがshared read sessionを迂回できる依存関係。

## Review — Iteration 2

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-24T09:12:19Z
- **Iteration:** 2
- **Scope decision:** none

journalとRegistry境界は解消したが、lock slot公開とstale writer takeover、およびread sessionの列挙APIに未解決点がある。

### Findings

- [Critical] lock recoveryは未解消。writer slotのmkdirからowner record永続化までの停止で永久lockが残るため、完全なrecordを含むtemporary slotのatomic publish、または不完全slot専用の安全なreclaim状態機械が必要。
- [Critical] stale writer回復の所有権取得順序が循環している。stale slotを検証後にrecovery leaseへatomic takeoverする手順、token fencing、失敗時の復元規則が必要。
- [Major] read sessionにdirectory列挙APIがなく、extra file／未登録公開artifactの検出を実装できない。shared lock下のpublic root list APIが必要。
- [Resolved] journal状態機械は具体化済み。
- [Resolved] Projection Registry schemaは具体化済み。
- [Resolved] validatorのfilesystem直接依存禁止は明記済み。
