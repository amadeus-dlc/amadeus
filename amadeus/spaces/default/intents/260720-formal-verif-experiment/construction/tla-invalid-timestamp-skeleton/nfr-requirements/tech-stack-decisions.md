# Tech Stack Decisions — tla-invalid-timestamp-skeleton

## Constraints

`business-logic-model.md` のdedicated integration harness、`business-rules.md` のverified TLC / CI trace、`requirements.md` のrisk-first Bolt、`technology-stack.md` のcurrent stackを維持する。production deployment、database、framework配布を追加しない。

## Selected stack

| Concern | Selection | Rationale |
| --- | --- | --- |
| Harness | Bun 1.3.13 / TypeScript ESM | typed state / Resultとexisting CLIを再利用 |
| Composition | Git dedicated worktree / commit / tree identity | baseline + Arm T + #1252の順序を固定 |
| Model check | U4 verified OpenJDK 26.0.1 / TLC 1.7.4 | frozen arm toolchainを再利用 |
| Evidence | U3 filesystem bundle / ledger transactions | local attemptsをcontent-addressed保存 |
| CI | trusted-baseline GitHub Actions workflow_dispatch metadata / bounded artifact | workflow definition / checkout SHAとmachine-readable 2 rowsを証明 |
| Tests | `bun:test` + temporary Git repositories | composition / crash / traceを決定的検査 |

## Isolation profile

integration worktreeはmainへmergeしない専用branchで、Git config / hooks / external diff / localeをU2と同じisolated profileへ固定する。TLC processはU4のnetwork-deny、JDK distribution、jar、heap、workers profileをそのまま使う。

## Rejected additions and checks

new CI provider、deployment environment、database、remote cache、parallel attemptsを追加しない。typecheck / Biome / bun test / package checkに加え、main diff 0、CompositionHead再計算、trusted workflow blob / ref / permissions / checkout、bounded archive / row bijectionを検査する。
