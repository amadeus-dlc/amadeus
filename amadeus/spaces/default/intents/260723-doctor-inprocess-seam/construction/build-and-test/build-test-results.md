# Build and Test Results — Doctor in-process seam

## 上流成果物

- `construction/doctor-inprocess-seam/code-generation/code-generation-plan.md`
- `construction/doctor-inprocess-seam/code-generation/code-summary.md`

## 実行環境

- Workspace: repository worktree root
- Runtime: Bun 1.3.13
- Test Strategy: Minimal
- External services: none
- Executed at: 2026-07-23T06:24:25Z

## Build results

| コマンド | 終了 | 結果 |
|---|---:|---|
| `bun run typecheck` | 0 | production/tests の2 tsconfig が成功 |
| `bun run lint:check` | 0 | error 0、既存 warning 250、info 17 |
| `bun scripts/package.ts --check` | 0 | claude/codex/cursor/kiro/kiro-ide/opencode の6 harness が同期 |

## Test results

| コマンド | Passed | Failed | Assertions |
|---|---:|---:|---:|
| `bun test tests/integration/t257-doctor-inprocess-seam.test.ts` | 11 | 0 | 41 |
| `bun test tests/unit/t37.test.ts tests/unit/t83-doctor-orphan-worktree.test.ts` | 39 | 0 | 70 |
| 8-file同時負荷回帰 | 115 | 0 | 520 |
| security-focused 3-file回帰 | 37 | 0 | 94 |
| `bun run coverage:ci -- --verbose -P 4` | 6,651 assertions | 0 | 6,651 |

full regression は462 test files、失敗 file 0。証跡は
`tests/logs/2026-07-23T06-19-28Z/` と `coverage/tests-totals.json`。
AWS credential が無効/期限切れのため live SDK/substrate tests は runner の既存規則で
skip された。Issue #857 の対象 tests はすべて実行済みである。

## Coverage results

- Project: 27,918 / 34,769 lines、80.2957% — PASS
- Patch: LCOV測定対象211行 = covered 201 + allowlisted 10、uncovered 0 — PASS
- allowlisted 10行は `tests/.coverage-patch-allowlist.json` に理由と失効条件を持つ
  runtime-erased TypeScript 型注釈
- 証跡: `coverage/coverage-totals.json`、`coverage/lcov.info`、
  `/tmp/amadeus-857-patch.diff`

## Security results

- `bun test` の security-focused regression: 37/37 PASS
- `bun audit --audit-level=high`: exit 1、High 3件
  - `fast-uri@3.1.2`: GHSA-v2hh-gcrm-f6hx
  - `fast-uri@3.1.2`: GHSA-4c8g-83qw-93j6
  - `hono@4.12.23`: GHSA-88fw-hqm2-52qc
- 依存経路:
  - `@anthropic-ai/claude-agent-sdk@0.3.158`
  - `@modelcontextprotocol/sdk@1.29.0`
  - `ajv@8.20.0` → `fast-uri@3.1.2`
  - `@hono/node-server@1.19.14` → `hono@4.12.23`
- これらは既存の private development dependency であり、Issue #857 では
  `package.json` と lockfile を変更していない。依存更新は別作業として追跡する

## Failure details

### SEC-DEP-001

- Severity: High
- Component: development dependency graph
- Expected: `bun audit --audit-level=high` exit 0
- Actual: High advisory 3件で exit 1
- Issue #857 との関係: 変更前から存在する transitive dependency で、doctor seam の
  source/test 差分とは独立
- 対応: compatible upstream dependency 更新を別 issue で行い、`bun audit`、
  full regression、package drift check を再実行する
- 本 stage での判断: 対象外依存を無断更新せず、security readiness を CONDITIONAL とする

application build、requirement tests、integration regression、coverage には failure なし。
