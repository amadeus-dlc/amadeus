<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-08-06T07:05:00Z — 本 intent の 6 unit は本ステージ到達時点で全て main へ着地済みだったため、
  build-and-test を「これから作るものの手順書」ではなく「着地後の main を検証し、その結果を記録する」位置づけで実行した。
  指示書は将来の再現手順として書き、実測は着地断面で取った。
- 2026-08-06T07:05:00Z — Comprehensive 戦略でも、性能 NFR / セキュリティ NFR が不在なら専用試験は新設しない。
  代わりに「適用外である根拠」と「患部に対応する既存面」を明記する形を取った（空の指示書を作らない）。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-08-06T07:05:00Z — `bun run no-silent-drop` が記録ブランチで `BASELINE_INVALID`（exit 2）。
  出荷コードは各 PR の CI で `NO_SILENT_DROP_OK` 済みであり、ledger の base 束縛が main の前進で stale になる
  設計上の toll。合格扱いにせず、非合格として結果に明記した。

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-08-06T07:05:00Z — FR-5d の「非0 exit」を満たすために engine の exit 契約を変更する選択肢もあったが、
  本 intent のスコープ外（directive 契約の変更は全ハーネスに波及する）。実測して食い違いを記録し、
  #2376 として起票する形を選んだ。要件の文言を後から書き換えて辻褄を合わせることはしていない。

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- 2026-08-06T07:05:00Z — 記録ブランチ（`worktree-xrev-open-bugs`）の PR 化と ledger 再束縛のタイミング。
  intent 完了処理の一部として実施するか、別 PR にするか。
