# Code Summary — unit s13-zero

## Commits(worktree `bolt-s13-zero`、base `main`)

| sha | subject |
|---|---|
| `c6e33c355` | feat(learnings): digest-bound zero-candidate confirmation (unit s13-zero) |
| `a5434c13d` | feat(otel): register LEARNING_ZERO_CONFIRMED / LEARNING_CANDIDATE_ADDED |
| `31d8893bf` | chore(tests): regenerate coverage registry for s13-zero |

## 実装 summary

- `amadeus-learnings.ts`(+221行): `confirmZeroCandidates`(digest一致 + candidates空 → `ZeroReceipt`、それ以外は`NotZero`)、`addConductorCandidate`(候補集合への追加専用、既存候補は不読・不変)。2つの新規CLIサブコマンド(`confirm-zero`、`add-candidate`)が純関数をラップし監査記録の副作用を持つ。
- `event-registry.ts`(+29行)・`amadeus-audit.ts`(+8行)・`audit-format.md`・`docs/reference/12-state-machine.{md,ja.md}`: `LEARNING_ZERO_CONFIRMED`/`LEARNING_CANDIDATE_ADDED`をcategory `"learning"`で登録、canonical count 93→95。
- `tests/unit/t-learnings-s13-zero-seam.test.ts`(新規、343行)・`t28-audit-event-sync.test.ts`/`event-registry-drift.test.ts`のpin更新。

## 検証(実測)

builder notesにはRed測定と設計判断の記述はあるが、最終検証コマンドの一括結果表は残っていない。notesに明記された実測は以下。

| 対象 | 結果 |
|---|---|
| `bun test tests/unit/t-learnings-s13-zero-seam.test.ts`(実装前) | exit 1(下記Red逐語) |

その他の検証(typecheck/lint/build/registry-check個別exit code)はnotesに転記が無く未転記。

## Red 逐語

Command: `bun test tests/unit/t-learnings-s13-zero-seam.test.ts`(worktree `bolt-s13-zero`)

Exit code: 1

```
bun test v1.3.13 (bf2e2cec)

tests/unit/t-learnings-s13-zero-seam.test.ts:

# Unhandled error between tests
-------------------------------
1 | })
2 | {
    ^
SyntaxError: Export named 'confirmZeroCandidates' not found in module '/Users/j5ik2o/Sources/j5ik2o.github.com/amadeus-dlc/amadeus/.amadeus/worktrees/bolt-s13-zero/dist/claude/.claude/tools/amadeus-learnings.ts'.
      at loadAndEvaluateModule (2:1)
-------------------------------


 0 pass
 1 fail
 1 error
Ran 1 test across 1 file. [339.00ms]
```

business-rules.mdのRed期待(「現行: SurfaceOutputにdigest相当のフィールドが存在せず…機械的な0件確定手段が存在しない(呼び出せるAPIがない)ことを実測する」)と一致することを確認。

## 申し送り

- 設計判断(FDが明示的に開いた自由度内、逸脱ではない): digest不一致+候補0件のケースは3アーム目を追加せずNotZero{candidateCount:0}へ(business-logic-model.mdが「NotZeroまたは明示エラー」を実装者裁量としていた)。`addConductorCandidate`のマージ非実装(呼び出し側=conductorの責務)はbusiness-logic-model.mdの明記どおり。
- 検証の一部(typecheck/lint/build個別のexit code、及びGreen後の最終pass件数)はnotesに転記が無く未転記。
- 逸脱: notesには明示的な逸脱記載なし。
