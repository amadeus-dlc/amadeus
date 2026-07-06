<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-07-06T12:30:00Z — 逆変換の流用元は dev-scripts/parity-check.ts の normalizeModelOverlay（非 export）と実測。installer への結線は import ではなく最小再実装を選択（Q1 = A。project.md の「repo の開発用スクリプトを実行時参照にしない」原則との整合）。意味論の正は #554 側に残し、乖離は eval で検出する。
- 2026-07-06T12:30:00Z — base 未記録・管理外値は「置換せずコピー」（Q2 = A、#554 の役割分担と一貫）。questions は自己判断で確定し gate の人間承認で確定する（bugfix の小さな構造判断）。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-07-06T12:35:00Z — §12a 反復 1 = NOT-READY 6 件。Critical（questions の business-overview 参照欠落 = upstream-coverage SENSOR_FAILED）は参照補完 + sensor 再発火で SENSOR_PASSED（fire id 5263fbe0）。High（readModelOverrideLine / setModelOverrideLine が apply-model-overrides.ts で export 済みという再利用面の見落とし）は Q1 を A = export 済み helper の import + 管理値集合判定のみ内製へ確定し直し、item5 / 制約 / Q1 の三者を整合。FR-1.3 へ fail-open 残存リスクと eval 固定（FR-4.1）を明記。README は grep 実測（言及なし）により変更対象から除外。
- 2026-07-06T12:35:00Z — 反復 1 finding 6（merge 順の証跡不在）は偽陽性と反証: DECISION_RECORDED（Stage: state-init、2026-07-06T12:16:22Z）が本 record の audit shard に実在し「merge 順 = #572 B002 → #579」を含む。第三者検証性のため制約節へ証跡参照を追記した。

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
