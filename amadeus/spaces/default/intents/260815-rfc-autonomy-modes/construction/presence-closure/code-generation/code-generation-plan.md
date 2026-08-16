# Code Generation Plan — unit presence-closure(U6 / C13 / FR-12 / D7・D8 / ADR-11)

## 拘束

- R-1/R-2(D7): `approve-batch` は presence 未検証時に必ず拒否する。検証は `withAuditLock` の内側、コールバック最初の操作として実行し、状態読取・冪等ショートカット・emitのいずれよりも前段に置く(TOCTOU排除)。
- R-3(D8): `resolveGatePresence` は ledger-absent を scope(active/legacy vs named)に関わらず一律 fail-closed とし、現行のscope分岐(fail-open/fail-closed使い分け)を廃止する。
- R-5: `humanActedSinceGate(pd, verb?, intent?, space?): boolean` の公開シグネチャは不変。`amadeus-state.ts` の3呼出し元は無改修で新fail-closed判定を継承する。
- R-6: presence検証は `humanActedSinceGate(pd)` のverb省略形を再利用し、`approve-batch`専用の新判定ロジックを実装しない。

## TDD 順序(実施順、branch `bolt-presence-closure`)

1. line-number再測定: `handleApproveBatch`(FD記載`:1226-1274` → 実測`:1235-1283`、batch1-3統合によるドリフト)、`scanPresenceLedger`/`humanActedSinceGate`(FD記載どおり `:3766-3811`/`:3877-3899` で不変)。
2. Red #1(D7): `t-approve-batch-presence-guard.integration.test.ts` を先に作成 → Red(2 pass/3 fail — approve-batchがpresence無しで無条件成功)。
3. `bun run build` 実施(テストがdist importするため)後、Red #2(D8): 既存 `t188-human-presence-gate.test.ts`/`t509-presence-legacy-shard.integration.test.ts` で旧fail-open pin 3件が赤。
4. 実装: `amadeus-lib.ts` に `resolveGatePresence` + `verifyBatchApprovalPresence`、`amadeus-bolt.ts` の `handleApproveBatch` の `withAuditLock` コールバック最初の操作として presence check を挿入。
5. Green確認(11ファイル、184 pass / 0 fail)。
6. FD未記載の追加発見への対応(`humanPresenceGuardDisabled()` suite-wide off-switch)を同一unitの一貫性追補として実装(下記「申し送り」参照)。

## 検証・配送

- swarm batch 4(config-visibility / presence-closure)。
- referee: `dd6407456 integrate bolt-presence-closure (batch 4)` で `swarm-int-rfc0001` へ収束。base `57f40d5d5`(batch3統合断面、interactive-carveout/semi-authority-projection integrated + t481 reconcile)。
- worktree: `.amadeus/worktrees/bolt-presence-closure`、branch `bolt-presence-closure`、HEAD `b9833d8b6`。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-16T12:33:44Z
- **Iteration:** 1
- **Scope decision:** none

U6 presence-closure code-gen artifacts trace cleanly to D7/D8 rules R-1..R-7 with disclosed, justified deviations; 2 FOLLOW-UPs on doc sync/bypass switch, 1 NIT on R-5 evidence gap.

### Findings

- FOLLOW-UP | business-logic-model.md 統合シーム / code-summary.md 申し送り | Consumed functional design explicitly assigns 'services.md の C13 補記と依存行列への C13 行列追加' to 'コード変更と同じ変更列で…本unitの実装時タスク' (business-logic-model.md:66), but code-summary.md:83 declares this out-of-scope ('owned files外。触っていない') and redirects to the conductor with no adjudication record cited and no evidence in the reviewed artifact set that the sync was actually applied. The worktree-ownership norm plausibly explains why the code-generation subagent itself could not touch inception/application-design/ files, but the task remains genuinely undelivered against an explicit FD assignment — recommend the conductor confirm/execute the services.md and component-dependency.md sync before intent completion, or record an explicit adjudicated scope change.
- FOLLOW-UP | code-summary.md 申し送り (:81) vs business-rules.md R-1 / security-design.md | New verifyBatchApprovalPresence carries an env-var bypass short-circuit (humanPresenceGuardDisabled()/AMADEUS_SKIP_HUMAN_PRESENCE_GUARD) added to mirror sibling amadeus-state.ts guards (G25/G26/G27), so the guard's 'must always refuse when presence is missing' R-1 guarantee is conditionally bypassable — this is disclosed with citation and justified by suite-compatibility evidence, but business-rules.md R-1 and security-design.md's fail-closed narrative do not mention the bypass switch on this new production function, leaving a design-doc/code drift for a security-relevant control. Recommend updating business-rules.md/security-design.md to document the uniform bypass pattern.
- NIT | code-summary.md 検証(実測) table | R-5's specified 落ちる実証 (byte-identical diff of the three amadeus-state.ts call sites of humanActedSinceGate before/after this unit) is not explicitly listed among the verification runs, though the commit list and owned-files scope (amadeus-bolt.ts + amadeus-lib.ts only) implicitly satisfy it — an explicit diff-check line would close the traceability loop for R-5's stated falling proof.
