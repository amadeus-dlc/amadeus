# Performance Requirements — metrics-observation

> 数値は強制メカニズムから導出(nfr-requirements:c3 — 照合なしの数値を書かない)。

- **P-1: snapshot job の実行上限 = `timeout-minutes: 5`(強制メカニズム = GitHub Actions の job timeout)** — 根拠: 全 collector は既存出力の読取+軽量走査で、最重量の lizard 実測でも 0.35s(feasibility)。5分は10倍超の余裕を持つ防衛値で、これを超える場合は設計前提(D2: 再実行しない)の破れとして調査対象。
- **P-2: CI 総時間の実質非増** — snapshot job は既存 job と並行しない後段(needs: coverage)だが、ci-success 集約外(U3 設計判断)のため PR のクリティカルパスに影響ゼロ。main push run の壁時計増分は P-1 上限内。**合否の強制メカニズム(U3 で新設)**: ci.yml のテキストに対し (a) `ci-success.needs` に metrics-snapshot が含まれない (b) metrics-snapshot job に `if: push && main` ガードが存在する、の2点をアサートする unit テスト `tests/unit/t222-ci-snapshot-wiring.test.ts` を U3 で新設する(方式 = t152-windows-portability :47-51 の readFileSync+toContain 文字列検査様式 — 構造 YAML パーサの新規依存は導入しない。U3 functional-design business-rules #4 に伝播済み)。着地後の実 PR run で「metrics-snapshot job が PR に現れない」ことの実測確認も code-summary に記録する。
- **P-3: 手動 `--write` はローカルで 10 秒以内**(強制メカニズム = bun test の per-test timeout 引数に 10_000 を指定した統合テスト — t76 の 30000 指定と同じ既習様式。lizard フル計測が支配項で、超過はテスト赤として検出)。

## Review

**Verdict:** NOT-READY
**Reviewer:** architecture-reviewer (delegated)
**Date:** 2026-07-12T00:00:00Z
**Iteration:** 1

Scope: this Review section covers all 5 files under `construction/nfr-requirements/` (performance-, security-, scalability-, reliability-requirements.md, tech-stack-decisions.md) — no single file is designated primary by the stage definition, so findings are consolidated here.

### Findings

| # | Severity | Location | Finding | Recommendation |
|---|---|---|---|---|
| 1 | Critical | performance-requirements.md:6 (P-2) | P-2 claims the product-lead handoff item "CI 時間の定量合否基準" is closed via a "機械検証"(mechanical verification) — "ci.yml の needs グラフ diff". No such diff tool/script/test exists anywhere in the repo, and none is planned: `ci-snapshot-job/functional-design/business-rules.md` (U3, rule #3) only documents that `metrics-snapshot` is excluded from `ci-success`'s `needs` (ci.yml:224-226, confirmed by grep), it says nothing about diffing the needs graph across commits/PRs. `memory.md:16` records this as resolving product-lead handoff (1) in full, which is a false-closure claim (검증劇場 per team norm P2/nfr-requirements:c3 — a claimed enforcement mechanism must be real, and constants-from-code / mechanism-cite-verify-at-draft require verifying cited mechanisms exist at draft time). A developer cannot implement "needs グラフ diff" without guessing what it diffs, against what baseline, or what tool runs it. | Either (a) specify the mechanism concretely — e.g. a script that snapshots `ci-success.needs` (and/or the full job-dependency graph) at HEAD~1 vs HEAD and fails on structural change, naming the file it will live in and when it runs — or (b) drop the "機械検証" framing and state P-2 is verified by the already-real, grounded fact that U3 business-rules #3 keeps `ci-success.needs` unchanged (self-evident from the diff of ci.yml itself, reviewable but not a standalone check). Either way, update memory.md's closure claim to match what's actually enforced. |
| 2 | Major | reliability-requirements.md:4-5 (R-2/R-3) vs scalability-requirements.md:4 (SC-2) | R-2 designates "workflow の手動 re-run" as the recovery path after a loud-fail, and R-3 guarantees re-runs on the same commit are non-destructive because each run gets an independent `captured_at`-derived filename. That means every manual re-run of a flaky/failed run silently adds another permanent `metrics/*.json` file for the *same commit*. SC-2's growth model ("マージ頻度 × 数KB = 年間MBオーダー") only accounts for one snapshot per merge and does not mention or bound retry-driven duplicates — so the stated accumulation estimate understates real growth, and there is no NFR governing duplicate-per-commit accumulation (retention/dedup is explicitly deferred to backlog B2, but B2 is about retention *policy*, not about this specific retry-multiplication mechanism). | Either bound retries (e.g., only the first successful snapshot per commit is kept, or re-runs overwrite via a deterministic non-timestamp key) or explicitly fold the retry-multiplication factor into SC-2's growth estimate so it isn't silently invalidated by R-2/R-3's own design. |
| 3 | Minor | scalability-requirements.md:3 (SC-1) | The 16KB per-file size assert is cited as SC-1's enforcement mechanism, but it appears in none of the U2 (`metrics-snapshot-cli`) functional-design artifacts (`business-rules.md`, `domain-entities.md`) — FR-5's stated AC only covers "collector 追加がスキーマ他部に diff を生じない," a different test. A developer building from functional-design alone would miss this NFR-only constraint. | Cross-reference SC-1 in FR-5's AC or U2's business-rules.md so the size-cap test survives the handoff into code-generation. |
| 4 | Minor | performance-requirements.md:7 (P-3) | Unlike P-1 (GitHub Actions job `timeout-minutes`, a pre-existing platform mechanism requiring no new code), P-3's "テストの timeout" names no concrete test file, runner flag, or timeout value/mechanism, and no functional-design artifact mentions a wall-clock assertion for `--write`. | Name the concrete enforcement (e.g. explicit `Bun.spawnSync` wall-clock assert in a named test file) at code-generation time, or note here that this NFR is spec-only pending that stage. |

### Validation Tool Results

No stage-declared validation tools were run (none listed in scope); findings are based on direct grep/read verification against the working tree.

### Independent Verification Evidence

- `ci.yml:24` → `permissions: contents: read` (top-level) — confirmed, matches S-1's cited precedent.
- `ci.yml:80` → `contents: read` (coverage job's per-job permissions block) — confirmed.
- `ci.yml:133` → third `contents: read` occurrence, not cited but consistent with S-1's "workflow 全体は read 維持" claim.
- `release.yml:48` → `contents: write # release-it pushes the bump commit + tag; gh-release creates the release` — confirmed, matches S-1/S-4's cited precedent for job-scoped `contents: write` and bot-author commits.
- `package.json:18` → `"lint": "bunx @biomejs/biome check tests/ packages/setup/ packages/framework/core/ scripts/"` — confirmed `scripts/` is inside the lint glob, matches T-3's claim of automatic lint inclusion.
- feasibility 0.35s figure: `ideation/feasibility/feasibility-assessment.md:9` → "`--check` 実行 0.35s(本 worktree)" — confirmed verbatim, matches P-1/P-3's cited basis.
- `ci.yml:223-226` (`ci-success` job's `needs: [check, coverage, codecov-status]`) — confirmed `metrics-snapshot` is not and will not be a member per U3 business-rules #3, grounding P-2's "ci-success 集約外" half of the claim (but not the "needs グラフ diff" verification half — see Finding 1).
- `scripts/package.ts` — confirmed it only walks `CORE_ROOT`/`harness/` trees (`HARNESS_ROOT`, `CORE_ROOT` references at lines 58/234/255/336), never `scripts/` itself, grounding D1/FR-6's dist-non-copy claim.
- No occurrence of "needs グラフ diff" / "needs-graph" / "クリティカルパス" mechanism anywhere in the repo outside this file (`grep -rln` across `.github/workflows/`, the intent record, and the repo root) — grounds Finding 1's "not real, not planned" assertion.
- No occurrence of "16KB" / "16384" in the U2 functional-design files — grounds Finding 3.

### Summary

Four of five NFR files are well-grounded (S-1/S-4, T-3, D1/FR-6 all check out against real file:line evidence). The blocking issue is P-2: it claims the product-lead's explicit handoff concern (CI time quantified) is closed via a "mechanical" needs-graph-diff check that does not exist and is not specified anywhere downstream — this is exactly the false-closure pattern the team's own verification-theater guardrail (P2, nfr-requirements:c3) exists to catch. Fix Finding 1 (and ideally 2) before this proceeds to nfr-design/code-generation.
