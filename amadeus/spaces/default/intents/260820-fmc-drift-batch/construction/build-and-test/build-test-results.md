# Build and Test Results — 260820-fmc-drift-batch

検証二層: 正本 = リモート CI(remote-first 規律 — cid:code-generation:push-first)、補助 = origin/main 断面でのローカル targeted 実測。測定 ref はすべて本文に併記。各実行観点の由来は unit-test-instructions.md / integration-test-instructions.md(上流: 各 unit の `code-generation-plan.md` / `code-summary.md`)。

## リモート CI(正本)

4 Bolt PR すべて merge queue 経由で着地し、各 merge commit の必須集約 `CI Success` は success(取得コマンド: `gh api repos/amadeus-dlc/amadeus/commits/<merge-sha>/check-runs`、取得日時 2026-08-21T00:55Z 頃):

| PR | unit | merge commit | CI Success |
|----|------|--------------|-----------|
| #3362 | advisory-retirement | `1a1ffb58f` | success |
| #3363 | revise-model-commit | `e28ed4cf3` | success |
| #3364 | boundary-three-face | `40090987e` | success |
| #3374 | applicability-arms | `3ae6223f4` | success |

Project Coverage Gate / Patch Coverage Gate / t146 / registry freshness を含む blocking 集合は `ci-success` 集約の needs に含まれ、上記 success はその全体の green を意味する。

## ローカル targeted 実測(補助)

- 測定 tree: scratch worktree(detached)= `origin/main` **`99f61828c`**(全4 PR 着地後の断面)。conductor checkout(feat/fmc-drift-batch)は merge-base 断面で実装を含まないため測定に使用していない(three-dot diff 空を実測)
- `bun install --frozen-lockfile` → 118 packages
- `bun run build` → **exit 0**
- `bun run typecheck` → **exit 0**(tsconfig.json + tsconfig.tests.json)
- `bun run lint` → **exit 0**(errors 0。483 warnings / 22 infos は既存)
- targeted テスト(コマンド: `bun test <9ファイル>`):

```
169 pass / 0 fail / 597 expect() calls — 9 files, 677ms
```

対象9ファイル: t448-tla-registration / t146-core-hygiene / t481-pr-convergence-lifecycle / t-formal-verif-model-map-v2(unit)、t3186-tla-applicability-arms-cli / t3186-tla-applicability-arms-predicate / t449-tla-registration / t439-tla-authoring-cli / t526-advisory-handoff-stage(integration)

## 失敗詳細

なし(build / typecheck / lint / targeted テストすべて green。リモート CI も4 merge とも success)。

## カバレッジ

blocking 正本は CI の Project / Patch Coverage Gate であり、4 PR とも green で通過済み(上記 CI Success に包含)。applicability-arms は1周目 Patch Coverage Gate 赤(UNCOVERED 9 行)→ テスト追加で2周目 green の経過が code-summary に記録済み。ローカルでの coverage 再計測は実施しない(single-owner / remote-first 規律)。

## 未検証面の申し送り

- フルスイートのローカル完走は実施していない — 正本はリモート CI の `ci-success`(上表)。この書き分けは cid:build-and-test:verdict-names-unverified-facets に従う
- tla2tools(TLC)を要する e2e はローカル環境に TLC 前提が無く対象外(既存赤の帰属は boundary-three-face code-summary の ablation で確定済み)
