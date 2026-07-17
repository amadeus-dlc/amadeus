# Build Test Results — teamup-resume-size-drift(Issue #1081)

上流入力(consumes 全数): fix-1081-size-drift の code-generation-plan.md / code-summary.md(実測値の転記元)。

## 全数実測(exit code)

| コマンド | exit | 実施者 |
| --- | --- | --- |
| `bun run typecheck` | 0 | builder+conductor |
| `bun run lint` | 0 | builder+conductor |
| `bun run dist:check` | 0 | builder |
| `bun run promote:self:check` | 0 | builder |
| `bun test tests/unit/t-test-size-drift.test.ts`(修正後) | 0(16 tests) | 三重 |
| 落ちる実証(small 注入時の同テスト) | **1** → 復元 **0** | conductor+reviewer 独立 |
| `run-tests.sh --integration --filter t-team-up-codex-resume` | 0(37 pass、drift **0 file(s)**) | conductor+reviewer |
| フル `run-tests.sh --coverage` + patch gate | patch gate **PASS(measured 0)**。coverage 全体は t163 負荷フレーク1件のみ赤(本 diff 無関係、assertion 実文帰属) | conductor |

## 恒常性実測(AC-1e、7点)

31.299 / 31.30 / 31.989 / 32.530 / 32.899 / 33.92 s(+filter run 実走)— 全て ≥30s(large 帯)。

## CI

PR #1090 — watch 中(typecheck-lint-drift-tests → Coverage の順)。green 確認後にマージ伺い。
