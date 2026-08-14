# Code Generation Plan — plugin-settings-core

上流入力: `functional-design/business-logic-model.md`(ワークフロー 1〜3)、`business-rules.md`(R1〜R12)、`domain-entities.md`(型契約)、`nfr-design/security-design.md` / `logical-components.md`(配置)。

## 実行形態

swarm batch 1(referee = `amadeus-swarm.ts`、driver = subagent floor)で `amadeus-builder-agent` に委譲。worktree `bolt-plugin-settings-core`(base = origin/main `d554cc7c5`)。conductor が prepare / acquire / confirm-dispatch / check / settle-release / finalize を所有。

## 計画(TDD vertical slice 順)

1. 宣言 parse の骨格(red → green)
2. 宣言の検証規則 R1〜R4(red → green)
3. 綴り誤り検出 R9/R10(red → green)
4. 既存 manifest 非退行ガード(落ちる実証 (iv))
5. config キー `plugin.settings`(R5/R8、red → green)
6. 解決の純関数 R6/R7(red → green)
7. センサー配線(C4、red → green)
8. docs 4 面(t432 逐語一致)

配置は logical-components.md のとおり: 共有語彙は新規 leaf `amadeus-plugin-settings.ts`、parse は `amadeus-plugin-compose.ts`、config は `amadeus-config.ts`、解決・受け渡しは `amadeus-sensor.ts`。

## 完了条件(remote-first — ユーザー是正 2026-08-14 反映)

- ローカル: typecheck / lint / complexity / targeted テスト green + 落ちる実証 (i)〜(v) 実測
- blocking 検証の正はリモート CI(PR #3052 の必須チェック)。実装コミット後すみやかに push + PR 作成し、ローカルフルスイートを完了条件にしない

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-14T13:09:55Z
- **Iteration:** 1
- **Scope decision:** none

plan/summary/report は FR-SET-1〜4・R1〜R10・I1〜I4に整合し、pr-convergence-report のN/Aは検証劇場でなく正直な観測でBLOCKERなし。

### Findings

- FOLLOW-UP | code-summary.md の TDD 証跡は commit ペア 1 件のみ提示で残り 6 slice の hash 未列挙 — 独立検証には branch 全 16 コミットの突合が必要
- FOLLOW-UP | R11(appendUnknownPathIssue 閉性非退行)の専用実測記述がなくフルスイート相乗りとしか読めない
- FOLLOW-UP | report の観測面が Patch Coverage 是正までで timing sink guard 是正が未反映(observed 時刻以降の変化)
