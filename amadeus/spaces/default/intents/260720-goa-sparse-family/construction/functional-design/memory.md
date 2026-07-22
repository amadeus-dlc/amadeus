<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-07-20T06:48:12Z — canonical/sparse 判別は先頭 token が裁定済み有効 label の場合だけ sparse とした; それ以外を既存 canonical 経路へ渡すことで `2x...` と `1xz...` の既存エラー文言を保存し、reviewer iteration 1 の曖昧さを閉包した。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-07-20T06:48:12Z — components.md の corpus sweep unit test 集約案を integration test 配置へ精密化した; memory 層の実 FS を読む新規 unit test は fs-tests-integration-first に違反するため、純粋文字列 fixture のみ unit に残す。
- 2026-07-20T06:51:22Z — UI非該当の optional candidate 不存在を列挙確認せず reviewer/sensor 対象を3成果物に限定した; stale frontend-components.md の残存とQ3文言矛盾を gate cross-check が捕捉したため削除し、以後は produces 候補の実在/不存在をディレクトリ全数列挙してから reviewer scope を確定する。

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-07-20T06:48:12Z — grammar prefix 抽出より構造境界抽出を選んだ; E-GSFFD2 裁定どおり不正 token を parser へ温存し、末尾 `/` の除去を次の有効 head 直前だけに限定して empty-segment 拒否を守る。

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
