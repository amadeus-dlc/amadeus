<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- [2026-07-20T05:09Z] Deviation: reviewer iteration 1 = NOT-READY(Critical 2: t238:96-98 BR-R1 反転の無申告 = symmetric-pair-review の対操作欠落 / 1物理行複数レコード形の未識別 — 12物理行/17occ の corpus 実形状。Major 2+Minor 2)。是正: ADR-3 Consequences で反転申告、**ADR-4 新設**(レコード抽出契約 — 入力単位=1レコード・extractGoaRecords ヘルパー canonical 1定義・区切り衝突の決定的解消)、sweep テスト artifact 明示ほか全6所見。
- [2026-07-20T05:09Z] Deviation: 是正 bun -e の zsh glob 展開で regex リテラル2箇所が無音空文化 → grep 検分で自己捕捉し Edit ツールで復元(quoted-heredoc-default/agmsg-args-no-backquote と同族のシェル特殊文字クラス violation — PM 自己申告)。iteration 2 で復元含め全閉包確認。
- [2026-07-20T05:09Z] Interpretation: iteration 2 = READY(6/6 閉包・退行なし)。非ブロッキング数値1点(ADR-4 の「8つ」内訳)を機械再計算で精緻化(team.md 複数レコード行 2+2+4、project.md 寄与0 — fix-diff-independent-reverify)。
