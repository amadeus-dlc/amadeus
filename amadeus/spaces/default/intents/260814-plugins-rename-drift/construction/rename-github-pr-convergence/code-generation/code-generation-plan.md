# Code Generation Plan — rename-github-pr-convergence

上流入力: `functional-design/business-logic-model.md`(実施手順 7 ステップ・書換え可否決定表・落ちる実証設計)、`business-rules.md`(R1〜R8)、`domain-entities.md`、`nfr-design/security-design.md`。

## 実行形態

swarm batch 1(referee = `amadeus-swarm.ts`、driver = subagent floor)で `amadeus-builder-agent` に委譲。worktree `bolt-rename-github-pr-convergence`(base = origin/main `d554cc7c5`)。

## 計画

1. TDD: scope-grid 検証テストを先に作成(改名前 green)+ ADR-2 の落ちる実証(注入 → 赤 → revert)
2. `git mv` + plugin.json name 同時変更(FR-REN-1)
3. パス軸消費者 26 件の同期(実装前に base 断面で再実測 — R8)
4. 素の名前軸 4 面の同期(FR-REN-3/4)
5. 不変識別子 4 種+歴史記録の非変更(FR-REN-5、diff 機械確認)
6. build → 残存参照 2 述語の実測(FR-REN-6)

## 完了条件(remote-first — ユーザー是正 2026-08-14 反映)

- ローカル: typecheck / lint / build(追跡不変)/ source-only 検査 / 対象テスト群 green + 落ちる実証 1 セット
- blocking 検証の正はリモート CI(PR #3051)。コミット後すみやかに push + PR 作成

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-14T13:12:39Z
- **Iteration:** 1
- **Scope decision:** none

code-summary/report を functional-design 7ステップ・決定表・R1-R8・requirements FR-REN-1〜8 と突合し、逸脱申告・26件再実測・落ちる実証1セット・残存参照2述語・正直なN/Aがすべて上流と整合しBLOCKERなし。

### Findings

- FOLLOW-UP | R2 の不変識別子のうちセンサーid/スキル名/ツールファイル名3種の diff grep 実行結果が実測表に未記載(→ conductor が実測し code-summary.md 追補節へ記録済み)
- NIT | report の kind 更新時に observed at も更新すること
