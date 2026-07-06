<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-07-05T21:00:00Z — 設計判断 AD-1〜AD-5 を記録した。単一ファイル + 責務別関数群（AD-1）は Right-Sizing と dev-scripts 慣行からの導出。AD-4（hooks 配線の正 = manifest 定数）は「配布元 settings.json からの動的抽出」との比較で、個人設定混入の構造的排除を優先した。application-design-questions は作成しない（設計判断は AD 台帳と gate 承認で確定し、未確定は O-2 だけのため）。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-07-05T21:20:00Z — reviewer iteration 1 は NOT-READY（重大 1 = copyEngine 契約から FR-1.4 が欠落するリスク、中 1 = FR-1.9 の追跡欠落、軽微 2 = FR-2.4 / FR-3.1 の対応表欠落、申し送り 1 = 同一 matcher 複数ブロック）。全件修正: placeAmadeusMd を独立した契約行として components / component-methods / component-dependency に追加（工程 [1/5] 内で copyEngine 直後）、manifest に FR-1.9/CON-1 の構造的担保を明記、FR-2.4 行を eval 対応表へ追加、README = FR-3.1 は Construction で直接執筆と明記、AD-6（複数ブロック前提のマージ設計）を追加して functional-design へ申し送り。reviewer の実測（hooks 14 個中 11 個が amadeus、3 個は kanban ローカル）により AD-4 の動的抽出回避が具体的に正当化された。

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
