<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-07-25T01:44:53Z — レビュー対応を6つの検証済みbugfix面として扱う; lifecycle完了判定、prompt CLIとbinding、legacy mutation authority、coverage正規化、設定読込TOCTOU、state codec C0受理を対象とする
- 2026-07-25T01:44:53Z — prompt問題はCLI欠落だけでなくbinding契約不一致を含む; ask/answerにbindingIdがなく、approveとskipの照合経路も一致しない

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-07-25T01:44:53Z — required-sections・upstream-coverage・answer-evidence sensorはcodekb出力が各manifestのmatches対象外で発火不能; 9成果物のH2、入力参照、質問ファイル不存在を直接検証した

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-07-25T01:44:53Z — 既存codekbを全面再構築せずHEAD差分と6面を差分更新した; repo全体の共有知識を維持しつつbugfix intentの所要時間と無関係な変更を抑える
- 2026-07-25T01:44:53Z — 巨大ファイル分割とgateway JSON lexer共通化は別amadeus-refactor intentへ分離した; 今回は再現可能な機能・安全性・coverage修正を先に固定する

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
