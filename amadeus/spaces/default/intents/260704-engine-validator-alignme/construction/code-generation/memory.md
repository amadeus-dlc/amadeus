<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-07-04T17:10:00Z — FR-3 の `repos` 既定値は空配列 `[]` とした; `resolveConstructionRepo` は `intentRepos` が `entry.repos ?? []` を返すため `[]` と「行なし」を同一に扱い、lone-repo 推論の挙動が変わらないことを確認した。
- 2026-07-04T17:20:00Z — FR-4 の `memory_entries_total: 0` の根本原因は runtime graph compile が `relativeMemoryPath(phase, slug)` を record prefix なしで呼び、memory_path が intent ディレクトリ抜きの実在しない path になること; surface は存在しないファイルを空文字として parse するため 0 件になっていた。phase の `spaces` は先頭からの固定 index 解決（`split("/")[1]`）が原因で、末尾から 3 番目のセグメント解決に変えた。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-07-04T17:40:00Z — 計画外の 2 ファイルを追加修正した; parity-check がエンジン 4 ファイル（amadeus-lib / amadeus-utility / amadeus-runtime / amadeus-learnings）の上流 hash 照合で fail するため `dev-scripts/data/parity-map.json` の `engineFileExceptions` に宣言し、promote-skill eval が正準ソースとの一致を要求するため `skills/amadeus-validator/validator/` にも同一の validator 修正を反映した。どちらも `npm run test:all`（AC-3）成立に必須。

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- 2026-07-04T17:25:00Z — `amadeus-state.ts` advance の stdout JSON にも record prefix 抜きの `memory_path`（L998）が残る; FR-4 の対象は runtime graph と surface のため今回は未修正。同種の欠落として別 Issue 候補。
- 2026-07-04T17:25:00Z — flat 移行（`migrateFlatLayout`）の registry 行は `repos: undefined` のまま; 移行対象は既存 record であり validator が未設定を許容するため意図的に据え置いた。
- 2026-07-04T17:45:00Z — intent-birth の state-build は scope 外ステージを `[ ] <slug> — SKIP` で書くが validator は `[S]` を要求し、本 Intent の実 record がこの検査で fail する; Issue #455 の 3 不整合には含まれない別系統の不整合であり、本 Intent の範囲外（validator の対象外検査項目の変更禁止）。別 Issue 候補として記録する。
