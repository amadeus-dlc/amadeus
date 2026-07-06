<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-07-06 — doctor の乖離判定は、business-logic-model.md の文言「宣言（model または fallback 先）と一致しない場合に警告」より厳格に、fallbackApplied 発動記録がある場合だけ fallback 値を正とする実装にした（実値 = fallback 先でも発動記録が無ければ「宣言未反映」として警告）。根拠: BR-3 が fallback の正当性を「明示発動 + 発動記録」に限定しており、記録なしの fallback 値は正当な fallback 状態ではないため。eval (g) 系列はこの挙動を固定している。
- 2026-07-06 — BR-6 の記載先は AGENTS.md の新設「運用注意」節とした。根拠: 上流同期の恒久的な手順文書が docs/amadeus に見当たらず、team.md の責務分担（AGENTS.md = 現在の作業環境で Agent が従う操作指示）に合致するため。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-07-06 — bootstrap 時に実値が fallback 先と同値だと base が記録されない回帰バグを実地確認で発見し、遡及 RED（旧ロジック復元で FAIL → 修正で GREEN）を経て修正、回帰固定 eval (b regression) を追加した。管理値集合の判定順序（base 記録前は「実値 = 管理値」でも base 候補として扱う）を明確化した。

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
