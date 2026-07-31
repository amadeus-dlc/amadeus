# Code Generation Plan — fix-1769-degrade-multiunit(Bolt 0)

上流入力(consumes 全数): requirements.md(FR-1769a〜c、スコープ追加の承認系譜込み)。functional-design 系は self-fix の SKIP により設計どおり不在。

## 手順
1. resolveDegradeUnit を uncovered-unique 規則へ拡張(FR-1769a)、fail-closed メッセージの実行可能化(FR-1769b)、t367 へ両側 regression(FR-1769c)。
2. worktree 分離(bolt/fix-1769-degrade-multiunit @ origin/main 95efbaf3f)、builder subagent 実装、allowlist 機械 remap、dist 7+self-install 再生成、落ちる実証、PR(Closes #1769)。
3. レビュー是正 round 2: Bugbot Medium(unitKind 伝搬)是正、CodeRabbit Major は選挙 E-OBB2-CG1(2-0、裁定 B = 単一 dir 常時解決の維持)で却下返信+意図的相違注記+covered 単一の回帰テスト(投票者留保の転記)。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-30T21:09:21Z
- **Iteration:** 1
- **Scope decision:** none

PR #1774マージ・#1769クローズ済み。resolveDegradeUnit の uncovered-unique 規則(FR-1769a/b)と t367 test 10-15(FR-1769c)がorigin/main実測どおり一致、無申告逸脱なし。

### Findings

- None
