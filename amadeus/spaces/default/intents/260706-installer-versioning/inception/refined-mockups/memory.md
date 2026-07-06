<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
- 2026-07-06T11:20:00Z — 細目 5 件（ステップ段数維持、version-info の exit 0、bootstrap 告知行、途中失敗時は manifest 非更新、files 辞書順）を確定した。特に「途中失敗時は manifest を書かない」は、退避済み + 上書き済みファイルが再実行時に (d) 象限（現状 = 新配布物）へ落ちて二重退避しないことを机上検証して決めた。
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
- 2026-07-06T12:00:00Z — §12a 反復 2（上限）が fix #2 の worked example に件数矛盾（ヘッダ 3 vs 列挙 4）を検出した。集計ルールを「ヘッダ = 退避総数（コピー由来 + 廃止由来）、列挙行数と常に一致、廃止分は内数行で告知」に一意化して修正。反復上限のため本修正は gate で確定する。
- 2026-07-06T11:45:00Z — §12a 反復 1 の指摘 6 件（Critical 2 / Major 3 / Minor 1)を全件反映した。(1) ステップラベルを実装実測（runStep 1〜4 = engine / skills / symlinks / settings）へ修正 — rough 由来の誤り（AMADEUS.md 独立段）を精緻化で見逃していた。(2) FR-2.6 の観測位置を summary 専用行として確定。(3) manifest スキーマへハッシュ算出元（変換後 / merge 後）の注記を復元（精緻化での退行を修正）。(4) version-info の不在時 exit を 0 → 1 へ再設計（rpm -q / dpkg -s 慣行。当初根拠の自己矛盾を指摘され、市場調査の先行事例準拠へ）。(5) smoke 失敗時も manifest 非更新を明示。(6) unknown 告知の位置を確定。反復 2 で確認する。
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
