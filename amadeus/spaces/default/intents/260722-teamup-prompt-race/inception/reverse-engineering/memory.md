<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
- 2026-07-22T22:16:34Z — 差分リフレッシュの base は cid:rescan-base-ancestry に従い祖先 observed の距離最小 `a326f47bc`(distance 101)を採用。日付がより新しい非祖先 observed(545e69c8 等、squash 運用由来)は `git merge-base --is-ancestor` exit 1 で除外した
- 2026-07-22T22:16:34Z — 原因の所在 = 設計(一般化漏れ): 260721-teamup-safety-wait が readiness 検証を `start_safety_wait_supervisors():340` の `[ "$RUNTIME" = "codex" ] || return 0` で Codex 専用に閉じ、claude 経路へ一般化しなかった(cid:bug-intent-linkage 用の帰属)
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
- 2026-07-22T22:16:34Z — 宣言センサー3種(required-sections / upstream-coverage / answer-evidence)は codekb 出力パスが sensor filter に構造不適合(既決知識 cid:re-sensors-codekb-filter-mismatch)のため発火せず、conductor 手動確認で代替: produces 9+re-scan record の実在 ls 全数 OK、`:340` / `:800` / `:830-832` の verbatim 裏取り一致
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
- 2026-07-22T22:16:34Z — claude actas watcher の ready センチネル生成タイミング(watch.sh:294-310)の実行時挙動は未実測 — requirements/design 段で修正方式(検証+再送)の閉包条件として実測する
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
