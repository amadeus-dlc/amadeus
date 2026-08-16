<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
- 2026-08-15T05:40:00Z — FR-1 の修正で第3の同期箇所(matchesReportExpectation)が実装中に発見された。2 箇所のみの修正では tally 成功後に report が stale-directive で落ちるため、3 箇所が 1 定義を読む形へ集約した(builder 申告 → conductor 承認)。同一述語が 3 箇所へ手書き複製されていたことが本バグの構造的原因
- 2026-08-15T05:40:00Z — FR-2 では t246 の integration fixture 自体が Lifecycle Phase 欠落のままバグ契約(常時 denied)を固定していた。fixture を実条件へ直し、IDEATION/INCEPTION で gated 実行と同一の拒否理由へ着地する behavioural equivalence で検証した
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
- 2026-08-15T05:40:00Z — FR-2 の「拒否メッセージを実条件へ更新」という要件文言は実行しなかった。修正後は既存文言が実条件と一致するため(builder が判断を明示申告、conductor 承認、code-summary に記録)
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
- 2026-08-15T05:40:00Z — reviewer FOLLOW-UP: t370:171 の 0×0ms 判別アサーションが時間アサーション禁止裁定の境界線上(両分岐が同一エラーを投げるため時間差以外に判別手段がない構造的例外)。次回ノルム整理で扱う
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
