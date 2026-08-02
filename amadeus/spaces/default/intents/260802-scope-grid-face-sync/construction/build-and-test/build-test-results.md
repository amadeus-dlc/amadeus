# Build and Test Results — 260802-scope-grid-face-sync

上流入力(consumes 全数): code-generation-plan.md、code-summary.md

測定 ref: conductor ツリー(mirror merge 後 HEAD)および bolt ブランチ 904c702de。すべて実行出力からの転記。

## conductor ツリー実測(2026-08-02)

| コマンド | exit | 備考 |
|---|---:|---|
| `bun install --frozen-lockfile` | 0 | 初回のみ(node_modules 不在時の typecheck 127 対策) |
| `bun run typecheck` | 0 | |
| `bun run lint` | 0 | 371 warnings / 22 infos は既存ベースライン(エラー0) |
| `bun run dist:check` | 0 | |
| `bun run promote:self:check` | 0 | |
| `bun test`(宣言5ファイル: t413 / t-self-scope-consistency-sensor / t89 / t93 / t370) | 0 | **Ran 55 tests across 5 files、55 pass / 0 fail**(実在5=宣言5) |

## bolt ブランチ実測(builder、code-summary.md より転記)

| コマンド | exit | 備考 |
|---|---:|---|
| `bun run coverage:ci` | 0 | RESULT: PASS、9962 assertions / 0 failed |
| `bun tests/coverage-patch-gate.ts --check` | 0 | added 107 / covered 107 / uncovered 0、allowlist 追加なし |
| `bun tests/coverage-project-gate.ts --check` | 0 | 89.72% |
| `bun tests/complexity-gate.ts --check` | 0 | |

## PR CI

PR #2041 — 発行時点で mergeable: MERGEABLE、CI 実行中(失敗0)。green 確定はマージ承認伺いの前提として別途確認する。
