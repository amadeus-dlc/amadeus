<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-08-18T12:18:32Z — t425(存在主張)と t181(不在主張)は同一リテラル `--batch <n>` について正反対を主張する対の契約であり、U1 が 7 ハーネス面の prose を `<directive.batch>` へ変えた時点で構造的に矛盾していた。U1 の census(P1〜P7)は `packages/` の code join のみを走査し `tests/` を含まなかったのが取りこぼしの機序。実装ではなく旧契約を pin したままの台帳が誤りと判定し、t425 側を resync した(実装・prose は無変更)
- 2026-08-18T12:18:32Z — Step 10 の成果物名はステージ本文が `test-results.md`、directive の produces が `build-test-results.md` と食い違う。directive を正として `build-test-results.md` に書いた
- 2026-08-18T12:18:32Z — 検索述語自体の不具合を実測。このシェルは zsh でクォートなし変数展開が語分割されないため、`FILES="a b c"` を `for f in $FILES` で回すループは 1 回だけ不正パスで回り、実在するリテラルまで含めて全件 0-hit の偽陰性を返した(`never owns queue order` が 7/7 実在するのに 0/7 と出た)。zsh 配列と `"${(@)files}"` 相当の展開で再実測して正しい census を得た。既知の ugrep 系トリガ(選言の複雑度超過・語境界 `\b`)とは別機序で、grep 自体は呼ばれず exit code も 0 になるため cid:reverse-engineering:c6-absence-predicate-exit-code の exit code 検査では捕まらない

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-08-18T12:18:32Z — なし(ステージ本文の Step 順に従った)

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-08-18T12:18:32Z — PR #3202 は mergeStateStatus BEHIND だが手動 rebase せず、必須 CI green 後に merge queue へ委ねる方針を採った(cid:ci-pipeline:strict-up-to-date-before-merge — main の前進だけを理由に手動 rebase を繰り返さない)。base 前進範囲 c8c393bba..cd905b05d は metrics 系 2 コミットのみで、no-silent-drop / t433 面に接触しないことを diff で実測済み
- 2026-08-18T12:18:32Z — t433 の CI 赤は帰属を切り分けて flake と判定した(同一 run・同一 head の Coverage ジョブでは同テストが pass、ローカル b1 でも 14 pass / 0 fail)。ローカル再現や ablation を組む前に同一 run の別ジョブとの突合を先に引く手順が有効だった(cid:code-generation:user-1 の逆方向適用)

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
