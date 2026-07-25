<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
- 2026-07-25T12:05Z — 同日 RE(observed 4a0f91ad0)が CI・テスト・コードスタイル・セキュリティのスキャン面をカバーしているため、それを証跡として代用し affirm 済み team.md / project.md との差分ギャップのみを対象とした(cid:practices-discovery:c1)。独立フルスキャンは実施しない。
- 2026-07-25T12:05Z — RE が記録した負債4件(#1384 の保護不在 / テストが sentinel を自前で書く構造 / CLAUDE_MONITOR_PROMPT の4箇所散在 / worktree 直列作成)を既存ルールと照合した結果、いずれも org.md Forbidden(検証劇場)・construction.md(canonical 1定義)・既 persist の cid 群で説明でき、**新設・変更すべきルールなし**と判定した。
- 2026-07-25T12:05Z — discovered-rules.md の ## Mandated / ## Forbidden は完全な空セクションとした。注記行(「追加なし」等)は practices-promote の書式契約に fail-closed 拒否されるため(cid:practices-discovery:c3-empty-rules-format)。
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
- 2026-07-25T12:05Z — conductor が consumes を3成果物と誤認して起草し、upstream-coverage が 6件 unreferenced で FAILED。実際の宣言は6成果物(code-structure / technology-stack / dependencies / code-quality-assessment / architecture / business-overview)。cid:requirements-analysis:consumes-first-drafting(宣言を先に読んでから本文を書く)の違反。全4成果物のヘッダと参照ブロックを是正し、宣言 consumes × 全成果物の総当たり grep で閉包を機械確認した。
- 2026-07-25T12:05Z — 是正の置換で team-practices.md の H2 が1つに潰れ required-sections が FAILED。節構成を「## 本ステージの結論」「## 適用される実務」の2 H2 + 配下 H3 群へ組み直して解消。是正 diff 自体が新たな欠陥を作った実例(cid:requirements-analysis:fix-diff-independent-reverify の対象)。
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
- 2026-07-25T12:05Z — 新設ルール0件のため team-practices.md は「再確約ではなく適用対象の明示」に留めた。affirm 済みルールを再掲して増やすと、どれが本 intent で新たに確約されたものか判別できなくなるため。
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
- 2026-07-25T12:05Z — なし。本ステージの判定(ルール追加不要)は差分ギャップ照合で一意に定まった。
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
