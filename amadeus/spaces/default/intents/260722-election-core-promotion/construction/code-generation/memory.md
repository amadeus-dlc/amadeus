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

- 2026-07-23T09:30:00Z — [Open questions] U3 review iteration 1: requirements FR-8a は選挙 transport の既存 env override として `AGMSG_SEND` を列挙するが、現行 `scripts/amadeus-election.ts` は `--send-script` と既定 `$HOME/.agents/skills/agmsg/scripts/send.sh` のみを実装し、`AGMSG_SEND` を参照しない。責務外の選挙コードへ契約を捏造せず、U3 は `team-msg.sh` の `AGMSG_SEND` 実 spawn、選挙の `--send-script` 実 spawn、既定 transport spawn を検証する。FR-8a 文言を現行契約へ合わせるか、選挙側へ env override を新設するかは iteration 2 で人間判断要否を判定する。
- 2026-07-23T04:51:42Z — [Deviations] U1 builder が申告付き逸脱1件(正本定義の tests/lib/ 共有モジュール化 — ND の「unit テストファイル内 export」は Bun の .test.ts 相互 import 制約(二重登録 or 無音スキップ)により実装不能と /tmp 隔離実測で確定)。裁定はユーザー直接回答方式に従い次のユーザーターンで諮る。実装は完了・全 green・落ちる実証 live 赤6件実測済み。
- 2026-07-23T04:51:42Z — [Interpretations] leader 経由のユーザー指示で資源制約モードへ — U1 完了を区切りとして停止し、U2 以降のディスパッチはユーザー帰還後。
