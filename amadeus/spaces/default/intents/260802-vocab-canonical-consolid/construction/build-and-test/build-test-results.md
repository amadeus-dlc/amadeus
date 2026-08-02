# Build Test Results — vocab-canonicalization

上流入力(consumes 全数): code-generation-plan.md、code-summary.md

- `code-generation-plan.md` の実行形態・完了条件と `code-summary.md` の実測値(PR #2044、head b783fe45c、検証表)を本書の前提として参照した

## 実測結果表(head b783fe45c、2026-08-02)

| 検証 | 実行者 | 結果 |
|---|---|---|
| bun run typecheck | builder / conductor 独立 | exit 0 / exit 0 |
| bun run lint | builder | exit 0 |
| bun run dist:check | builder / conductor 独立 | exit 0 / exit 0 |
| bun run promote:self:check | builder | exit 0 |
| glossary-projection.ts check | builder / conductor 独立 ×2 | exit 0(4 surfaces in sync) |
| t414 unit | builder / conductor / reviewer(i2) | 33 pass / 0 fail(三者一致) |
| t414 integration | builder / conductor / reviewer(i2) | 12 pass / 0 fail(三者一致) |
| bash tests/run-tests.sh --ci | builder | PASS(0 fail) |
| coverage:ci + patch gate(--base origin/main) | builder(single-owner) | PASS: measured 332 / covered 332 / allowlisted 0 / uncovered 0 |
| 落ちる実証(FR-5b) | builder ×2回 | 注入→exit 1(drift 列挙)→revert→exit 0 |
| リモート CI(PR #2044 checks) | GitHub Actions | 非 pass 0件(conductor gh 実測)、mergeable=MERGEABLE/CLEAN |
| t34 / t174 / t15 / t55 | builder 個別+reviewer 再実行 | 全 green |

coverage は同一 worktree の single-owner 規律(cid:code-generation:c1-coverage-single-owner)により builder 実測値を正とし、conductor はレポート値と CI の Coverage Report green で裏取りした。

## 測定 ref

- 全実測は branch `bolt/vocab-canonicalization` head `b783fe45c`(base origin/main `bf8de21f7`)。リモート CI は PR #2044 の head run。
