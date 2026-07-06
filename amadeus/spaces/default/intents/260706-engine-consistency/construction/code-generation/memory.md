<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-07-06T06:11:17Z — FR-1.1 の「Current Stage を none に設定」は complete-workflow 側の変更だけでは閉じなかった。`next`（Branch 10）が Current Stage を stage slug として再解決するため、closed-workflow sentinel `none` を done に解決するガードを `amadeus-orchestrate.ts` に随伴追加した。advance の finalize 経路（state.ts:1243）は以前から `none` を書いており、この潜在バグは #547 以前から存在していた（pdm-scope eval (f) が RED として検出）。
- 2026-07-06T06:11:17Z — FR-3.2 の実測: audit へ書く hook は 6 個。mint-presence（#479 で適用済み）、log-subagent（本 Intent で適用）、audit-logger / session-start / session-end / validate-state（見送り）。見送り根拠: audit-logger の ARTIFACT_* は完了済み record への編集そのものが異常であり、痕跡が残るほうが検出に有用。SESSION_* 3 hook は workflow 状態ではなく session 境界の観測イベントで、#476 系の実害（HUMAN_TURN 誤 mint・督促・SUBAGENT_COMPLETED 残渣）は未観測。適用するなら別 Issue（gate 報告で leader へ後続候補として申し送る）。
- 2026-07-06T06:11:17Z — FR-1.2 の「全ステージ [S] の phase」は「計画に stage が存在し、touched（not-started 以外）が 1 件以上あり、その全部が skipped」と解釈した。not-started が混じる phase（未着手のまま閉じた phase）は今回の対象外とし、Pending のまま残す既存挙動を維持した。
- 2026-07-06T06:11:17Z — FR-4 の skills/ 正準反映: エンジン tools/hooks（state / orchestrate / log-subagent）は skills/ に正準コピーが存在しないため反映対象なし（find で実測）。validator（lifecycle-v2 / AmadeusValidator）は source と昇格先の両側へ同一反映した。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-07-06T06:11:17Z — 要求が名指しするファイルに加えて `amadeus-orchestrate.ts` を修正した（FR-1.1 の帰結。上記 Interpretations 参照）。parity-map の例外 entry に随伴修正として明記した。

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-07-06T06:11:17Z — `next` の完了判定は Status: Completed ではなく Current Stage === "none" で行った。none を書くのは 2 つの終端経路（advance finalize と complete-workflow）だけであり、フィールド 1 個の精密な比較で済む。Status 併用はガードを広げるが、Status が Completed で Current Stage が実 slug のままという中間状態は存在しないため冗長と判断した。
- 2026-07-06T06:11:17Z — agent_type 空文字の既定は `?? "unknown"` を truthiness 判定（`?.trim()`）へ変更した。空白のみの文字列も unknown に倒れる。

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- 2026-07-06T06:11:17Z — SESSION_* 系 hook（session-start / session-end / validate-state）へ完了ガードを広げるかは後続 Issue 候補（FR-3.2 見送り分）。gate 報告に含める。
