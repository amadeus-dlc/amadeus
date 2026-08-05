<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-08-05T13:36:00Z — 質問は RE が送った裁定5件のうち既決(全ハーネス要件・復旧ガイド追加・判別化)から一意導出できない5判断に絞った(intent-capture:c1 / requirements-analysis:c5)。全5問ともユーザーが推奨選択肢を選択(13:33:27Z)。変更面は「復旧経路の二層化+メッセージ判別化」に限定され、3件のスコープ外項目は intent 完了時に Issue-first 起票する
- 2026-08-05T13:50:00Z — §12a iteration 1 BLOCKER(FR-1 AC の C1/C6 自己矛盾)への裁定: C6(carrier 分裂)は C1 と同一の (b) marker 不在へ写像するのが正 — 認可判定は単一 projectDir 配下しか読めず分裂と不在は判定点で区別不能のため、第5原因値は新設せず、区別は FR-5 手順書の原因別対応表が担う。iteration 2 READY で閉包
- 2026-08-05T13:36:00Z — 「resume 時のハーネス一致検査の新設」は要件化しない — docs/guide/11-session-management.md:7 が「resume works on every harness」を約束しており、一致検査はユーザー要件(どのハーネスでも)とも約束とも逆向きのため、スコープ外に明記した

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
