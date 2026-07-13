# Deployment Architecture — metrics-observation

クラウドインフラの新設なし。「デプロイ」に相当するのは **snapshot の main への書き戻し**のみ:

```
main push → GitHub Actions(ubuntu-latest、既存 CI と同一ランナー種)
  └ metrics-snapshot job(needs: coverage、if: push && main)
      ├ actions/checkout(既存様式)
      ├ artifact download(amadeus-coverage-report: coverage-totals.json / tests-totals.json)
      ├ bun scripts/metrics-snapshot.ts --write
      └ git commit → fetch/rebase origin/main → push(最大3回、GITHUB_TOKEN、bot author)
         → metrics/*.json が main に着地
```

`metrics-snapshot` job に `concurrency.group: metrics-snapshot-main`、`queue: max`、`cancel-in-progress: false` を宣言し、異なる main commit の job 間でも書き戻しを1本に直列化する。`queue: max` は既存 pending の置換キャンセルを防ぎ、最大100件を待機させる。その上で、job 実行中に main が更新される競合に備え、push のみを `git fetch origin main` → `git rebase origin/main` → `git push origin HEAD:main` で最大3回再試行する。push の stderr が non-fast-forward を示す場合だけ次の試行へ進む。rebase 衝突・認証失敗・その他の push 失敗・3回目の non-fast-forward は即時 loud-fail とし、collector / snapshot 生成自体は再試行しない。

ロールバック手順: snapshot コミットは追記のみで既存ファイル不変 — 誤った snapshot は `git revert <sha>` 1つで無害に戻せる(データ破壊面なし)。

## Review

**Verdict:** NOT-READY
**Reviewer:** amadeus-architect-agent (delegated architecture-reviewer)
**Date:** 2026-07-12T00:00:00Z
**Iteration:** 1

Scope: this Review section covers all 5 files under `construction/ci-snapshot-job/infrastructure-design/` (cicd-pipeline.md, deployment-architecture.md, infrastructure-services.md, monitoring-design.md, shared-infrastructure.md) — no single file is designated primary by the stage definition; findings are consolidated here (same convention used elsewhere in this intent's construction phase).

### Findings

| # | Severity | Location | Finding | Recommendation |
|---|---|---|---|---|
| 1 | Major | `shared-infrastructure.md:7` vs `.github/workflows/ci.yml:12-21` | The claim "既存 ci.yml の concurrency グループに従う(main 直列 — 同一コミットへの二重 snapshot を構造的に防ぐ副次効果)" overstates what the concurrency block actually does. Verified by direct read: `group: ci-${{ github.ref == 'refs/heads/main' && github.sha || github.ref }}` keys the group **by SHA** on main, not by ref — so each main commit gets its own concurrency group. This does prevent two *duplicate* triggers of the *same* commit's workflow from running the metrics-snapshot job concurrently (true part of the claim), but it does **not** serialize the metrics-snapshot jobs of two *different* commits pushed to main close together — those run in independent groups and can execute in parallel. Since `business-logic-model.md:5-6` and `deployment-architecture.md:11` specify a plain `git commit+push` with explicitly **no retry** ("リトライ・握りつぶしなし" per business-logic-model.md:6), two metrics-snapshot jobs racing on overlapping main advances will produce a non-fast-forward push rejection in the loser, surfacing as an unexplained job failure that has nothing to do with a real measurement problem. `monitoring-design.md:4` then reports this as "job失敗 = workflow run 赤" indistinguishable from a genuine collector failure, degrading the very health signal the design relies on. Given the team runs up to 4 parallel builders per intent with squash-merge PRs landing on `main` (org.md/team.md `cid:requirements-analysis:parallel-bolts`), back-to-back main pushes within the ~20-minute `coverage` job window (ci.yml:78 `timeout-minutes: 20`) are a realistic, not hypothetical, occurrence. | Either (a) add a pull/rebase-and-retry step around the `git push` (bounded retries, then loud-fail per S3), or (b) explicitly document the residual race as an accepted risk with rationale (why an occasional false-red job failure is acceptable) instead of asserting a serialization guarantee the concurrency config doesn't actually provide. Correct the "main 直列" framing in shared-infrastructure.md regardless of which fix is chosen — it currently reads as an architectural guarantee that isn't backed by the cited mechanism. |
| 2 | Minor | `cicd-pipeline.md:14` vs `business-logic-model.md:4` | `cicd-pipeline.md`'s step list says only "artifact download" without naming which upload-artifact bundle to pull from. `business-logic-model.md:4` clarifies it's the existing `amadeus-coverage-report` artifact (ci.yml:107) with two new paths added — but that artifact name never appears in `cicd-pipeline.md` or `infrastructure-services.md`. A developer implementing straight from the infrastructure-design files alone (without cross-referencing the functional-design FD) could reach for `actions/download-artifact` with a mismatched or unspecified `name:`. | Add the artifact name (`amadeus-coverage-report`) to `cicd-pipeline.md`'s step list or to `infrastructure-services.md`'s table row for "GitHub artifact store", so the infra-design files are self-sufficient for this detail. |

### Independent Verification Evidence

- **Operation guardrails (rollback + health metric)**: satisfied. `deployment-architecture.md:14` gives a genuine rollback path (`git revert`, safe because commits are append-only). `monitoring-design.md:3` gives a real health metric (job success/failure via existing GitHub Actions run history, no new infra) and an error-rate equivalent (job failure surfaces as workflow-run red). Both are real, not theater.
- **guard-activator norm**: satisfied. `cicd-pipeline.md:17` names all three guards (if / permissions / timeout) as statically declared by the U3 PR author in `ci.yml`, activated automatically by the GitHub Actions runtime, with `t222-ci-snapshot-wiring.test.ts` (business-rules.md #4) as the standing enforcement mechanism. No "someone must remember to configure an env var" pattern — confirmed against `t222`'s described 4-assertion contract in `ci-snapshot-job/functional-design/business-rules.md:6`.
- **cicd-pipeline.md yaml contract vs upstream NFR/FD (item 3 of the review brief)**: confirmed consistent by direct read, not assumed:
  - P-1 (job timeout 5 min, `metrics-snapshot-cli/nfr-design/performance-design.md:5`) ↔ `cicd-pipeline.md:11` `timeout-minutes: 5`. Match.
  - S-1 (job-level `contents: write` only, top-level stays read, `nfr-design/security-design.md:3`) ↔ `cicd-pipeline.md:12-13` and confirmed against the live `.github/workflows/ci.yml:23-24` top-level `permissions: contents: read` (unchanged). Match.
  - S-2 (no `secrets.*` reference in the job block, `nfr-design/security-design.md:4`) — this NFR-design finding (previously flagged Major in `performance-design.md`'s own iteration-1 review as missing from U3's FD) has since been propagated: `business-rules.md:6` now lists assertion (d) "metrics-snapshot job ブロック内に `secrets.` が出現しないこと(S-2)" alongside (a)(b)(c). Confirmed via direct read of the current file text and cross-checked against the audit log entry recording the 6/6 election that approved this propagation (`audit/j5ik2o-mac-studio-lan-8ae8f850c7a1.md:215`, "S-2 t222 (d) secrets 非出現の U3 伝播を6名独立確認"). No stale gap here.
  - Business rule #3 (metrics-snapshot excluded from `ci-success`'s needs graph) ↔ confirmed by direct read of `.github/workflows/ci.yml:223-229`: `ci-success` needs only `check`, `coverage`, `codecov-status` — `metrics-snapshot` is absent, matching the design. Match.
  - D3 (ci.yml job addition, no independent workflow) ↔ `deployment-architecture.md` and `infrastructure-services.md` both reflect this; matches `inception/application-design/decisions.md:17-22` verbatim (same alternatives rejected: workflow_run trigger, cron).
- **"Zero jobs currently download an artifact" claim (`shared-infrastructure.md:9`, E-L76 style unfalsifiable-negative check)**: independently confirmed by `grep -n "download-artifact" .github/workflows/ci.yml` → zero matches (only two `upload-artifact` occurrences, at ci.yml:66 and ci.yml:105/107). The claim is accurate, not asserted-without-evidence.
- **lizard 3rd-job / composite-action P3 filing condition (`cicd-pipeline.md:19`)**: independently verified against the actual #837 PR (not an Issue — `gh api repos/amadeus-dlc/amadeus/issues/837` resolves to PR #837, "feat(ci): CCN complexity gate"). The cited condition is a real, verbatim reviewer statement in that PR's comment thread (j5ik2o, 2026-07-10T23:50:17Z): "テストスイートを走らせるジョブが3つ以上に増えた時点で P3 整理として扱えばよい." `metrics-snapshot` would be the 3rd job to install pinned lizard (after `check` and `coverage`), so the condition is correctly triggered and the commitment to file a P3 enhancement at landing time is a legitimate, sourced obligation — not a hallucinated cross-reference. One caveat: this obligation lives only in `cicd-pipeline.md` prose; nothing in the delivery-planning or code-generation task list currently tracks it as an actionable landing-time TODO. Per `cid:code-generation:code-generation:bolt-pr-taskization` ("規範をタスク化しない限り実行されない"), recommend the conductor explicitly task this at code-generation/PR time rather than relying on this prose surviving to landing.
- **F1 (coverage-totals.json / tests-totals.json added to existing upload-artifact path)**: confirmed against live `.github/workflows/ci.yml:103-112` — current `path:` block only lists `coverage/lcov.info` and `coverage/html`; the design's "2行追加" is a real, minimal diff against the actual file, not invented.

### Validation Tool Results

No stage-declared validation tools were run beyond direct grep/read verification against the live `.github/workflows/ci.yml` and `gh api` cross-reference (no `validate-*` tool was listed for this stage in the review brief).

### Summary

The infrastructure design is largely sound, well-grounded against NFR-design and FD, and its cited cross-references (D3, #837, S-1/S-2/P-1, ci-success exclusion) all check out against live file/PR evidence. It is NOT-READY on one Major finding: `shared-infrastructure.md` asserts a serialization guarantee ("main 直列") that the actual SHA-keyed concurrency group does not provide across different commits, leaving the no-retry `git push` in the metrics-snapshot job exposed to a realistic race with this team's merge cadence — either add retry logic or replace the overclaim with an honestly-documented accepted risk.

## Review — Iteration 2

**Verdict:** NOT-READY
**Date:** 2026-07-12T00:00:00Z

- Major: the constant concurrency group omitted `queue: max`; default pending replacement could still cancel snapshots during a burst.
- Major: upstream R-2 prohibited retries for every git failure, conflicting with the bounded non-fast-forward push retry.
- Minor #2 remains resolved: the downloaded artifact is explicitly named `amadeus-coverage-report` in the deployment flow, CI/CD contract, and infrastructure service map.

## Review — Iteration 3

**Verdict:** READY
**Reviewer:** amadeus-architecture-reviewer-agent
**Date:** 2026-07-12T09:55:00Z

- Major #1 解消: 固定 group、`queue: max`、`cancel-in-progress: false` により、異なる main commit の job を1件ずつ実行し、最大100件の pending を置換なしで保持する。
- Major #2 解消: R-2 と実装契約を、non-fast-forward のみ最大3回再試行、認証・その他の push 失敗は初回で loud-fail に統一した。
- Minor #2 解消維持: download 対象は `amadeus-coverage-report` と明記した。
- 残存リスク: 100件超の burst は queue 上限を超える。stderr による non-fast-forward 判定は Git 出力に依存するため、実装時に NFF / 認証 / その他失敗の分類テストが必要。rebase 衝突は手動回復とする。
