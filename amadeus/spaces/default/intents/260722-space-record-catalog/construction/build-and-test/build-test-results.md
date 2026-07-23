# Build and Test Results

## 実行環境

- Runtime: Bun 1.3.13
- Test strategy: Comprehensive
- Inputs: Unit ごとの `code-generation-plan.md` / `code-summary.md` と統合済みソース

## Build

| Command | Status | Detail |
|---|---|---|
| `bun install --frozen-lockfile` | PASS | 257 packages |
| `bun run typecheck` | PASS | source/test tsconfig |
| `bun run lint:check` | PASS | error 0、既存 complexity warning |

## Tests

| Scope | Files / tests | Assertions | Failed |
|---|---:|---:|---:|
| 統合ブランチ対象 suite | 7 files / 71 tests | 431 | 0 |
| U1〜U4 統合対象 suite | 9 files / 88 tests | 464 | 0 |
| U2 全 CI | 467 files | 6696 | 0 |
| U4 全 CI | 468 files | 6709 | 0 |
| U3 全 CI | 471 files | — | 1 wall-clock drift |

U3 全 CI の1件は `tests/integration/t-codex-hooks-migration.test.ts` が medium の30秒上限に対して32.821秒だった時間分類 drift。U3 の移行ロジック、型、lint の失敗ではない。SDK/substrate の live test は AWS/Claude substrate 不在時の既定契約どおり skip。

## Coverage and Limitations

専用 coverage percentage はこの stage で採取していない。要求経路は registry hit、legacy fallback、missing、corrupt、duplicate、unreadable、双方向 drift、no-drift、migrationの7前提拒否、fidelity、非改変を直接 assertion している。性能 load test、DAST、認証・認可試験は実在対象がないため N/A。U3 の test config は既存 `tsconfig.tests.json` と root `package.json` を再利用し、変更していない。

## Verdict

CONDITIONAL PASS。build、型、lint、変更対象88テスト、referee は green。全 CI には変更外の wall-clock drift が1件残る。本番 migration execute は未実行。
