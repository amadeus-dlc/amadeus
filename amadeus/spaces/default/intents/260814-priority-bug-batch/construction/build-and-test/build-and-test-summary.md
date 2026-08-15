# Build and Test Summary — 260814-priority-bug-batch

> Depth Minimal(状態表+readiness 1 行)。測定 ref: conductor ツリー = bolt 取込済み断面、PR #3076 head = `984d6206e`(record checkpoint 同梱後)。

| 項目 | 状態 | 根拠(実測) |
|---|---|---|
| Build | PASS | `bun run build` exit 0、追跡ファイル不変(builder worktree・conductor 取込後の両断面) |
| Typecheck / Lint | PASS | `bun run typecheck` = 0 / `bun run lint` = 0(両断面) |
| Unit(targeted) | PASS | t07 ほか targeted 6 ファイル 111 pass 0 fail(builder)、取込後 t07+t2851+t-pi 37 pass / t427 26 pass(conductor) |
| Integration(targeted) | PASS | 同上(t2851 clean 実行・t-pi 新ケース含む) |
| Performance tests | N/A | 適用 NFR 不在の判定(performance-test-instructions.md に根拠・覆す条件を明記) |
| Security tests | N/A | 適用 NFR 不在の判定(security-test-instructions.md に同上) |
| Patch coverage(advisory) | PASS | coverage-patch-quick: added 18 / covered 18 / uncovered 0 |
| フルスイート(blocking) | CI 実測待ち | 正本 = PR #3076 の `ci-success` 集約(remote-first)。確定値は build-test-results.md に記録 |

Readiness: build-ready / test-ready。merge-ready 判定は CI green + レビュー収束後(pr-convergence 契約)。
