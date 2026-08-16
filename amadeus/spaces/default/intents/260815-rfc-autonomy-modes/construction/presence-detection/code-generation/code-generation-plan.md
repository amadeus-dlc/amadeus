# Code Generation Plan — unit presence-detection(U2 / C3 / FR-2)

## 拘束

- R-1: `resolveSessionInteractivity(projectDir)` が対話性判定の唯一の公開関数。Stop hook / 裁定順序分岐 / `--status` はすべてこの関数を呼び、独自に監査シャードを再読取・再判定しない(component-methods.md C3)。
- R-2: `interactive === true` はこのクローン専用シャード(`auditShardDir`+`auditShardName`)に `HUMAN_TURN` が1件以上あるときに限る。他クローン・merged buffer の在席を借用しない。
- R-3 / R-4: 判定不能(シャード不在・record 未解決・読取エラー・破損データ)は例外を投げず fail-closed `interactive: false` へ。過大評価(偽陽性)方向の経路は存在しない。
- R-5: 棄却済み代替(鮮度ウィンドウ・TTY判定・明示フラグ)は実装に持ち込まない(RFC Q3/Q3-B/Q3-C 棄却)。
- R-7: 読取専用境界 — いかなる監査イベントも発行せず、`mintHumanPresence` を呼ばない。

## TDD 順序(実施順)

1. 不在確認: `grep -rn "resolveSessionInteractivity\|SessionInteractivity" packages/ tests/ docs/` → 0 hits を実測。
2. `tests/integration/t560-session-interactivity.integration.test.ts` を先に作成(R-2〜R-7 をカバーする11ケース、R-1はコミットメッセージで別途言及)。
3. Red 実測(モジュール未 export によるコンパイル不能)。
4. `resolveSessionInteractivity` を `amadeus-intent-autonomy.ts` に実装(既存の `amadeus-state.ts handleDelegateApproval` の `auditShardDir`/`auditShardName`/`findAllEvents(HUMAN_TURN)` パターンを再利用、複製しない)。
5. `bun run build` で dist 再生成(兄弟テスト t433 が source と dist を diff するため必須)。
6. フル検証。

## 検証・配送

- swarm batch 1(recommendation-core / presence-detection / s13-zero / merge-provenance / grant-ceremony / d6-investigation を並行実装)。
- referee: `671123786 integrate bolt-presence-detection (batch 1)` で `swarm-int-rfc0001` へ収束。
- worktree: `.amadeus/worktrees/bolt-presence-detection`、branch `bolt-presence-detection`、base `main@2eb94f1e3`。worktree に node_modules/dist が無かったため `bun install`(261 packages)→ `bun run build` を先行実施。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-16T11:12:08Z
- **Iteration:** 1
- **Scope decision:** none

presence-detection code-gen matches unit-of-work scope/budget and traces cleanly to business-rules R-1..R-7 and FR-2; two non-blocking documentation-precision gaps found.

### Findings

- FOLLOW-UP | code-generation-plan.md:14 vs code-summary.md:13 | Plan states t560 covers only R-2..R-7 in its 11 cases and defers R-1 (single public read port) to the commit message only, but code-summary.md claims the same 11 cases 'pin' R-1..R-7 inclusive. This is an internal-consistency mismatch between plan and summary on what was actually test-verified for R-1 — reconcile the wording (or confirm/deny an actual case added for R-1) so the verification claim is measured, not overstated.
- FOLLOW-UP | code-generation-plan.md | Plan has no checkbox syntax (`- [ ]`) for its implementation steps as mandated by the code-generation stage contract Step 2 ('Create a detailed code generation plan ... with checkboxes for each implementation step'); content is otherwise complete and traceable, but step-completion tracking format deviates from the stage template.
- NIT | business-logic-model.md:62 | The prior functional-design review's FOLLOW-UP (R-1's falling-proof is only an existence check, not a single-entry-point behavioral check) is still open and not explicitly re-addressed or re-deferred in the code-generation artifacts; acceptable since single-entry-point enforcement structurally depends on U4/U7 not building private read paths, but worth an explicit one-line carry-forward note in code-summary.md's 申し送り section.
