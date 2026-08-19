<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
- 2026-08-19T08:06:36Z — 性能テストは「適用可能な NFR 不在(N/A)」と判定し実体を作らなかった; requirements.md の `## Non-Functional Requirements`(:73-79)は TDD 必須・fail-closed 保存・後方互換禁止・harness 移植性・監査 append-only の5項目のみで、時間/スループット/メモリいずれの数値閾値も宣言していない。nfr-requirements(3.2)もスコープ設定で SKIP。`cid:build-and-test:c2-no-test-theatre-for-absent-nfr` に従い、判定・根拠・将来この判定を覆す条件を performance-test-instructions.md へ明記した。セキュリティ NFR は3件存在するがいずれも数値でなく契約であるため、新規スイートを作らず既存の contract test へ帰着させた。
- 2026-08-19T08:07:26Z — 【訂正済み】当初「本ブランチは record 面のみでコード差分 0 のため、検証はローカルフルスイートを正本とし remote CI は同一コードの再走にすぎない」と解したが、この前提は偽であることが §13 選挙 E-260819-RFC0001-BT-S13 の両票の独立実測で判明した; committed record を入力として走る blocking テストが実在する — `tests/integration/t517-question-budget-sensor.integration.test.ts:350-351` が `amadeus/spaces/default/intents` 配下の全 `*-questions.md` を再帰走査し(本起草時に実読で確認)、`t514-nfr-budget-sensor` / `t461-subagent-stats` も同 corpus を読む。既存則 `cid:code-generation:c1-question-budget-corpus` が同じ非対称(record 同梱の瞬間に corpus sweep が発火する)を既に記録している。したがって record-only の変更こそ CI 固有の情報を持ち、record checkpoint PR も通常どおり必須 CI の green を merge-ready の正本とする(`cid:ci-pipeline:strict-up-to-date-before-merge`)。ローカルフルスイートは補助であって CI の代替ではない。
- 2026-08-19T08:07:26Z — upstream-coverage センサーを stage 成果物だけでなく memory.md にも手動発火させ、不要な FAILED 行を1件作った; memory.md は produces ではなく stage 日誌であり、consumes 参照を持たせるべき面ではない。監査は append-only のため取り消せない。手動発火は produces に列挙された成果物へのみ行うべきだった。
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
- 2026-08-19T08:07:26Z — `tests/integration/t435-intent-autonomy-production.integration.test.ts` の `full repairs repeated quality failures, replans once, and durably parks a stalled loop` が、ファイル全体実行では落ち単体実行では通る(本機で再現性あり、CI は同一コードで green)。秒截断タイムスタンプに依存する `freshHumanRetryTurn`(amadeus-intent-autonomy-production.ts:1553-1571)の比較がファイル内順序で反転する疑い。Issue 起票の可否を承認ゲートで諮る。
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
