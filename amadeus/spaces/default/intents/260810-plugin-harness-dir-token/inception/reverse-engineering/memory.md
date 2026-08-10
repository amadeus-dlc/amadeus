<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-08-10T04:52:00Z — scan mode を **xrev differential scan** と解釈; Issue #2790 はクロスレビュー2名成立済みの単発 Issue のため、レビュー verdict を Developer scan の一次入力とし、observed 断面での verbatim 実読で二重化する（先行 intent 260810-tla-applicability-wiring と同じ運用）
- 2026-08-10T04:52:00Z — base commit は本 intent に前回 scan が無いため `re-scans/` 中の最新 observed = `91f37ec8589cdf468599b4787e27e5125d4d16e8` を採用（stage 本文 Step 3 の規定どおり `reverse-engineering-timestamp.md` からは導出しない）

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-08-10T04:52:00Z — Step 3 の 8 body artifacts はフルスキャンではなく患部領域の差分更新に限定; base..observed の 117 ファイル差分に患部 7 パス（`plugins/pr-convergence/**`, `scripts/harness-transform.ts`, `scripts/plugin-projection.ts`, `packages/framework/core/tools/amadeus-plugin.ts`, `tests/unit/t146-core-hygiene.test.ts`）が 1 件も含まれないことを実測（`git diff --name-only <base>..HEAD -- <7 paths>` = 空）。Minimal depth の self-fix でフル再スキャンを走らせる根拠が無い

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-08-10T04:52:00Z — Developer scan を Opus subagent へ委譲（stage frontmatter `mode: subagent` の規定 + `.claude/CLAUDE.md` の Fable 5 委譲方針）。患部は小さいが U-1（2 本の配送路と変換器の非対称）の実測が高リスク判断を含むため Sonnet ではなく Opus を選択

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- 2026-08-10T04:52:00Z — **U-1（着手前に決着必須）**: runtime compose（`amadeus-plugin.ts:686` の byte-verbatim copy）にトークン置換器が無いため、素朴な `{{HARNESS_DIR}}` 化は Claude を含む全ハーネスを退行させうる。(a) compose 側にも置換を入れる / (b) plugin prose のパス規約を composed 位置基準へ変える / (c) authoring seeding を packager 変換経由にする、のいずれを採るかは設計段の裁定事項
- 2026-08-10T04:52:00Z — reviewer-2 の隣接所見（plugin 自身のツール参照 10 箇所が repo ルート相対で、consumer workspace では解決しない可能性）は INCONCLUSIVE のまま。本 intent のスコープに取り込むか別 Issue にするかは requirements-analysis で裁定する
- 2026-08-10T04:52:00Z — drift ガードは `t146-core-hygiene` の corpus を `plugins/` へ拡張する形が有力だが、同テストの `HARNESS_PATH_RE` は `.claude|.kiro|.codex` の 3 ハーネスのみで現行 8 ハーネスを覆っていない。述語側の同時更新の要否は設計段で判断する
