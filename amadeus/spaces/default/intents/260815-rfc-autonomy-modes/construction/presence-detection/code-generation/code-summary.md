# Code Summary — unit presence-detection(U2 / C3 / FR-2)

## Commits(worktree `bolt-presence-detection`、base `main@2eb94f1e3`)

| sha | subject |
|---|---|
| `ce7255f4d` | test(intent-autonomy): add falling proof for resolveSessionInteractivity (R-1..R-7) |
| `efd9bf9bb` | feat(intent-autonomy): add resolveSessionInteractivity read-only presence port |

## 実装 summary

- `packages/framework/core/tools/amadeus-intent-autonomy.ts`(+39行): `resolveSessionInteractivity` を追加。このクローン専用の監査シャードが `HUMAN_TURN` 行を1件以上持つかを読み取る単一の読取専用関数。あらゆる解決/読取エラーで fail-closed、例外を投げない、`mintHumanPresence` を呼ばない(在席を発行しない)。鮮度ウィンドウ・TTY判定・明示 config フラグは実装しない(R-5)。
- `tests/integration/t560-session-interactivity.integration.test.ts`(新規、245行): R-1〜R-7 を11ケースでpin。

## 検証(実測)

| コマンド | 結果 |
|---|---|
| `bun run typecheck` | exit 0 |
| `bun run lint` | exit 0(touched 2 ファイルで diagnostics 0、他は468件の pre-existing warnings で無関係) |
| `bun tests/gen-coverage-registry.ts --check` | exit 0("fresh, guards green, ratchet held") |
| `bun test tests/integration/t560-session-interactivity.integration.test.ts tests/unit/t431-intent-autonomy.test.ts tests/integration/t432-intent-autonomy-runtime.integration.test.ts tests/integration/t433-intent-autonomy-five-harness-projection.integration.test.ts tests/integration/t435-intent-autonomy-production.integration.test.ts` | 84 pass / 0 fail |
| `bun test tests/unit/t-test-size-drift.test.ts` | 16 pass / 0 fail(t560 が integration/ の medium として正しく分類され unit-tier size-purity ratchet を汚さないことを確認) |

## Red 逐語

Command: `bun test tests/integration/t560-session-interactivity.integration.test.ts`(実装前)

```
bun test v1.3.13 (bf2e2cec)

tests/integration/t560-session-interactivity.integration.test.ts:

# Unhandled error between tests
-------------------------------
1 | })
2 | {
    ^
SyntaxError: Export named 'resolveSessionInteractivity' not found in module '/Users/j5ik2o/Sources/j5ik2o.github.com/amadeus-dlc/amadeus/.amadeus/worktrees/bolt-presence-detection/packages/framework/core/tools/amadeus-intent-autonomy.ts'.
      at loadAndEvaluateModule (2:1)
-------------------------------


 0 pass
 1 fail
 1 error
Ran 1 test across 1 file. [315.00ms]
```

Exit code: non-zero(1 fail / 1 error)。

実装後の Green:
```
bun test v1.3.13 (bf2e2cec)

 11 pass
 0 fail
 23 expect() calls
Ran 11 tests across 1 file. [169.00ms]
```

## 申し送り

- 逸脱: none。worktree 内の intent record ツリー(`amadeus/` 配下、present だが untracked)は触っていない — 本 unit の record ではないため。push はしていない(rule #6)。
