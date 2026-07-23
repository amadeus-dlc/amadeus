# Integration Test Instructions — Doctor in-process seam

## 上流成果物

- `construction/doctor-inprocess-seam/code-generation/code-generation-plan.md`
- `construction/doctor-inprocess-seam/code-generation/code-summary.md`

Minimal strategy の通常範囲を超えるが、変更対象が CLI、filesystem、audit、
child process、生成物境界を持つため、既存 integration tests の再実行を必須とする。

## 対象境界

- in-process core と CLI wrapper
- migration doctor と heartbeat
- routing、workspace inspection、Codex hooks ownership
- audit lock、orphan worktree、post-output fatal child watcher

## 同時負荷回帰

```bash
bun test \
  tests/integration/t257-doctor-inprocess-seam.test.ts \
  tests/integration/t226-migration-doctor-heartbeats.test.ts \
  tests/integration/t246-routing-and-autonomy-guards.test.ts \
  tests/integration/t249-workspace-inspection.test.ts \
  tests/integration/t-codex-hooks-ownership.test.ts \
  tests/integration/t104.test.ts \
  tests/unit/t37.test.ts \
  tests/unit/t83-doctor-orphan-worktree.test.ts
```

各 test は一時 directory を所有し、外部 service を必要としない。成功条件は全件成功、
hang、timeout、孤児 child process がないことである。

## Full regression と coverage

```bash
bun run coverage:ci -- --verbose -P 4
bun tests/coverage-project-gate.ts --check
AMADEUS_PATCH_DIFF=/tmp/amadeus-857-patch.diff \
  bun tests/coverage-patch-gate.ts --check
```

full regression は failure 0、project coverage は80%以上、patch coverage は
実行可能行100%を成功条件とする。
