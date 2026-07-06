<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
- 2026-07-06T10:05:00Z — Inception 確定待ち 4 件を自己判断で確定し FR 化した（多体連携の運用: 小さな構造判断はピア協議にかけず gate で確定）。追加の縁ケースとして sourceCommit 取得不能時（git 不在）の扱いを unknown + 告知で確定した。FR-2.1 に (d) 象限（導入先が新配布物と既に一致 → 書き込み省略可）を追加し、判定表を完全にした。
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
- 2026-07-06T10:35:00Z — §12a 反復 2（上限）の残 4 件を修正した。(1) FR-5.1(h) = FR-2.6 の eval 項目を追加。(2) FR-5.1(e) へ usage エラー系を追加。(3) FR-6.1 本文に BR-13 注意書きを明記（逆参照だけにしない）。(4) C-6 充足の記録場所を正確化 — reviewer は scope-document.md / memory.md を grep して「実在しない」と判定したが、実記録は audit shard の scope-definition 宛 DECISION_RECORDED（434 行）に実在する。引用の曖昧さが原因のため、記録場所を明示する文言へ修正した。反復上限のため修正は gate で確定する。
- 2026-07-06T10:20:00Z — §12a 反復 1 の指摘 8 件（HIGH 1 / MED 2 / LOW 5）を全件反映した。主な追加: BR-13 × 独自 skill を「既知の限界」節で対象外と明示（HIGH）、承認済み wireframe の previous install found 行を FR-3.3 として採用（MED）、FR-5.1 へ (f) 告知検証 (g) 自己参照除外検証を追加（MED）、FR-2.6 = 廃止ファイルの改変退避（無言消失の防止）、--version-info は --target 併用必須、自己導入の走査除外確認、C-6 充足の記録、確定件数の 5 件への訂正。
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
