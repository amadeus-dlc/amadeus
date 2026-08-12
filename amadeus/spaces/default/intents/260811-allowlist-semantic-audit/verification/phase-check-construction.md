# Phase Boundary Verification — Construction → (終了)

Intent: `260811-allowlist-semantic-audit`(scope `self-fix`、Depth `Minimal`、autonomy `full`)
測定 ref: worktree HEAD `git rev-parse HEAD` の実出力(本ファイルのコミット親)
実施日: 2026-08-11

`self-fix` スコープは operation フェーズを実行しない。したがって本境界は
**construction を最終フェーズとする workflow 終端の境界**である。

## 実行したステージ

| ステージ | 状態 | 成果物 |
|---|---|---|
| `code-generation` | 承認済み | `construction/fix-1622-allowlist-semantic-audit/code-generation/`(plan / summary / pr-convergence-report / evidence 11 点) |
| `build-and-test` | 承認済み | `construction/build-and-test/`(指示書 5 点 + summary + results) |
| `tla-authoring`(plugin) | 承認済み | `construction/tla-authoring/applicability-assessment.md`(terminal `not-applicable`) |
| `pr-convergence`(plugin) | 承認済み | `code-generation/pr-convergence-report.md`(verdict `converged`) |
| `formal-model-check`(plugin) | 本ステージ | `construction/formal-model-check/check-outcome.md`(`NOT_APPLICABLE`) |

SKIP されたステージ(`functional-design` / `nfr-requirements` / `nfr-design` /
`infrastructure-design` / `ci-pipeline`)は `self-fix` スコープの grid による。

## トレーサビリティ

### Requirement → Implementation

| 要件 | 実装 | 状態 |
|---|---|---|
| FR-1(全数分類・恒等式) | `tests/allowlist-semantic-audit.ts` + `evidence/classify-ledger.ts` | 完全 trace(`43 + 413 + 160 = 616`) |
| FR-2(転位の是正) | 台帳 18 件の是正 + `evidence/attribute-diff.ts` | 完全 trace(張り直し 11 / 削除 7、未帰属 0) |
| FR-3(記述規約と書き換え) | **撤回** | 申告付き。受け入れ基準が両立不能と実測で判明し、ユーザー裁定で撤回(`code-generation-plan.md` の契約改訂 3 段) |
| FR-4(機械ガード) | `tests/coverage-patch-gate.ts` の `findSyntaxClassMismatches` | 完全 trace(落ちる実証の両側あり) |
| FR-5(CI blocking 配線) | `ci.yml` の `coverage-head` → `coverage` → `ci-success` | 完全 trace(`evidence/ci-wiring.md`。実 PR での赤の実測は未実施 — 下記「未充足」) |
| FR-6(2 クラスの検出) | t536 / t537 | 完全 trace |
| FR-7(再実行可能な記録) | `evidence/` 11 点 | 完全 trace |
| NFR-1 / 2 / 4 | t536 / t537 | 完全 trace |
| NFR-3 | 既存 patch gate と同一ステップ内 | 数値目標なし(`performance-test-instructions.md` の判定) |

**orphan(要件を持たない実装)**: なし。変更ファイルはすべて上記いずれかの要件へ遡れる。

### Implementation → Verification

| 検証 | 結果 | 出典 |
|---|---|---|
| `bun run typecheck` / `lint` / `build` | exit 0 | `build-test-results.md` |
| `bash tests/run-tests.sh --ci` | 0 failed files / 13225 assertions / 0 failed | 同上 |
| patch coverage gate | PASS(added 225 / covered 225 / **allowlisted 0**) | 同上 |
| project coverage gate | PASS(93.1008% / 下限 90.00%) | 同上 |
| PR #2902 の CI | 17/19 pass(2 件 skip、赤ゼロ) | `pr-convergence-report.md` |
| §12a レビュー | READY(iteration 1) | `code-generation-plan.md` の Review block |

## 未充足・申し送り

1. **FR-5 の「意図的に赤にした PR がマージ不能になること」の実 PR 実測は未実施**。
   配線根拠は実読で確定済み(`evidence/ci-wiring.md`)、ガードの落ちる実証は in-memory と
   `runCheck` 経由で両側実測済みだが、**別ブランチでの実 PR 実証は行っていない**。
   `cid:code-generation:falling-proof-injection-one-set` により承認候補 PR の head へ注入を
   残さない方針を優先した結果であり、実施するなら別ブランチで独立に行う
2. **PR #2902 のマージは未実施**。`irreversible` は autonomy `full` のグラント範囲外であり、
   人間の明示承認が要る(`cid:requirements-analysis:no-ai-merge`)
3. **分離 Issue**: #2900(`expiry` の意味整合、P2)/ #2901(未宣言エントリの照合自動化、P3)。
   着手時期の決定は利用者の専権

## 裁定の未レビュー性(引き継ぎ)

requirements.md の A-5 が記すとおり、Q1〜Q4 は `decide-question` の
`decider: agent-recommendation` による裁定で **`reviewState: unreviewed`** である。
本フェーズで新たに行った裁定(§13 学習選定 2 件)も同じく unreviewed。
`amadeus-bolt review-auto-decision` による人間レビューは後日行われ、**反転しうる**。

## 判定

**PASS** — 実行したステージの成果物はすべて実在し、要件と実装の双方向 trace に orphan はない。
未充足 1 件(FR-5 の実 PR 実証)は上記に明示し、沈黙のスキップにしていない。
