<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-08-02T02:19:31Z — Codex は効果測定と dogfood の一次対象だが、合否規則は共有 core の統一 conformance 契約とする。harness 固有面は adapter と live probe の実証ケースとして接続する。
- 2026-08-02T02:23:13Z — 上流要件の主語を「Codex 利用者」から「影響を受ける全 supported harness の利用者」へ訂正した。Codex は性能評価の一次 cohort に限定し、正しさ・安全性は共通不変条件として扱う。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-08-02T02:19:31Z — 当初の「live Codex 専用ゲート強度」質問を撤回した。一次測定対象から専用ポリシーゲートを導く論理的根拠がなく、全ハーネス共通 predicate と harness 別 conformance probe へ再構成した。
- 2026-08-02T02:23:13Z — Feasibility で判明した要件レベルの曖昧さを残さず、承認済み Intent Capture の intent-statement と stakeholder-map を上流訂正した。対象 Issue と Bolt 順は変えず、品質契約の適用範囲だけを明確化した。

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-08-02T02:23:13Z — 全 harness に同じ性能改善率を要求せず、共通の停止性・予算・終了理由と adapter 証拠だけを必須にした。性能差は環境依存だが、安全契約まで環境依存にすると統一ゲートが成立しないためである。

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
