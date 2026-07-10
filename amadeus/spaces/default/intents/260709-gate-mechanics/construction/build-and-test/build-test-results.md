# Build & Test Results — gate-mechanics-batch

> 実測日時: 2026-07-10T01:47Z。対象ツリー: intent/gate-mechanics-batch(origin/main = 両 Bolt スカッシュマージ済み 20c2e9674 をマージしたコミット 5532ba775 以降)。すべて実行結果由来の実測値(build-instructions.md / unit-test-instructions.md のコマンドをそのまま実行)。

## ビルド結果

| コマンド | exit code | 状態 |
|---|---|---|
| `bun install` | 0 | success(257 packages) |
| `bun run typecheck` | 0 | success |
| `bun run lint` | 0 | success(エラー0) |
| `bun run dist:check` | 0 | success(drift なし) |
| `bun run promote:self:check` | 0 | success(drift なし) |

## テスト結果

### 全層(CI 同等: `bash tests/run-tests.sh --ci`)

- exit code: **0**(RESULT: PASS)
- Test files: **277 / Failed: 0**
- Total assertions: **4025 / Failed: 0**(skipped 0)
- wall-clock drift: 0 file(s)

### 要件別回帰面(unit-test-instructions.md の対応表)

| 回帰面 | コマンド | 結果 |
|---|---|---|
| FR-1(#685)| `bun test tests/unit/t112-delegated-approval.test.ts tests/unit/t188-human-presence-gate.test.ts` | **41 tests / 0 fail**(103 assertions) |
| FR-2(#670)| `bun test tests/e2e/t06.test.ts` | **7 tests / 0 fail**(31 assertions) |

## 失敗詳細

なし(全緑)。

## カバレッジ

- PR 時点の codecov: #727 / #729 とも patch(target 100%)含め全チェック green(GitHub checks 実測)
- 落ちる実証の記録は各 unit の code-summary.md(修正前赤 → 修正後緑、exit code 付き)を参照
