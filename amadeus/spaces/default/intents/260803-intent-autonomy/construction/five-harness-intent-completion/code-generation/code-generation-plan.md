# Code Generation Plan — five-harness-intent-completion

## スコープと追跡元

U5 `five-harness-intent-completion`（Issue #2067）だけを `self-feature` として実装する。正本は U5 の Functional / NFR Design と、U1 の live authorization、U3 の Intent autonomy projection、U4 の completed review continuation である。Claude Code、Codex、Cursor、OpenCode、Kimi Code の現行5 harnessすべてについて、同一実装・package・registry・scenarioに束縛されたcredential-attested live receiptが各1件そろった場合だけ、full grant completion、workflow clear、`WORKFLOW_COMPLETED` を一つのterminal transactionで確定する。

Kiro / Kiro IDEを含む全7 harnessのregistryは一つのCore正本から投影する。現時点のlive cohortは現行5 harnessから導出し、将来のharness追加時にcompletion algorithmを複製しない。配布物はpackage generatorから生成し、`dist/`を直接編集しない。

## 実装計画

- [x] **Step 1 — canonical harness registry**: 全7 harnessのpackage / self-install / live-completion capabilityを一つのregistryへ集約し、現行5 cohortを導出する。
- [x] **Step 2 — credential-attested authorization**: native environment、issuer、trace / span、attestation metadataを必須化し、欠落時は `PROVENANCE_REQUIRED` としてlive dispatchを拒否する。
- [x] **Step 3 — single-use dispatch**: reserve、reconcile-first、canonical claim、branded permit、stale / reused permit拒否、native operation / attempt idempotencyを実装する。
- [x] **Step 4 — receipt validation**: canonical auth / audit snapshot、Judge start / result、`AUTO_DECIDED` またはloud degradation proofを検証し、skip、forgery、revision mismatchを拒否する。
- [x] **Step 5 — cohort evaluation**: 同一implementation / package / registry / scenarioへ束縛された各harness exactly-one receiptだけをcanonical順で受理し、missing / duplicate / mismatchをterminal evidenceにしない。
- [x] **Step 6 — atomic completion**: completion evidence、任意の `INTENT_GRANT_COMPLETED`、`WORKFLOW_STATE_CLEARED`、`WORKFLOW_COMPLETED` を固定順序・単一revisionのterminal transactionとしてcommitする。
- [x] **Step 7 — persistence / replay**: completion seal、event identities、projection revisionを検証し、snapshot reloadとidempotent replayを実装する。U4 completed review seedを維持する。
- [x] **Step 8 — nonterminal absence**: credential / capability不足は `AWAITING_HUMAN` とし、成功receiptやcompletion evidenceを捏造しない。
- [x] **Step 9 — audit / projection**: `INTENT_COMPLETION_TRANSACTION_COMMITTED` をcanonical audit eventとして登録し、全7配布treeと現行5 self-install surfaceへ投影する。
- [x] **Step 10 — verification**: focused behavior、five-harness projection、opt-in live seam、Event Registry drift、typecheck、Biome、coverage、全integration、package / promote drift、`git diff --check`を検証する。

## 非目標

PR / GitHub / merge semantics、外部runner / supervisor、credential発行・保存、live attestationの代作、harness固有completion Core、U1〜U4のauthority再実装は対象外とする。Kiro / Kiro IDEはregistryから削除せず、live completion capabilityがfalseの間は必須cohortへ含めない。

## 検証基準

- deterministic test doubleではhappy pathとmissing / duplicate / skip / forged / mismatch / partial commitを網羅する。
- opt-in live seamは5 harnessすべての実credential-attestationが存在する場合だけ実行し、欠落時は明示的にskipする。
- `bun run typecheck`、対象Biome、coverage freshness、全integration、`bun scripts/package.ts --check`、`bun run promote:self:check`、`git diff --check`がgreenである。
- live実行0件をpassとして扱わず、credential不足を非terminal blockerとして記録する。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-04T01:15:20Z
- **Iteration:** 1
- **Scope decision:** none

U5はUnit間の直列依存を保ちつつ、5 harness native scenarioを独立実行可能にし、同一revisionへ束縛されたattested receiptを任意の適合性証拠として扱う。欠損・skip・不一致をlive passには数えない一方、Core terminal completionからは切り離す。宣言された検証証跡にも失敗はない。

### Findings

- None
