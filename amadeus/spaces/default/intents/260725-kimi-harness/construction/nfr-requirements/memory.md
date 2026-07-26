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

- 2026-07-25T13:30:00Z — Interpretations: N/A カテゴリは「存在しない対象」の反証可能な根拠付きで宣言し、全 Unit で5ファイルを欠かさず生成(required-sections 充足のため薄いファイルでも2 H2 確保)
- 2026-07-25T13:30:00Z — Deviations: diary の記録をステージ終盤まで失念し surface 0件で検出。以後ステージ中の随時記録に戻す
- 2026-07-25T13:30:00Z — Tradeoffs: 引用の正確性(BL/BR の節・ID レベル)で reviewer 指摘が続いた。c12(ヘッダ+実参照の同時作成)に加え「引用先の実在を書く前に確認」を徹底
- 2026-07-25T13:30:00Z — Interpretations: journey の認証所在(KIMI_CODE_HOME 差替で未認証となりうる点)は reviewer 指摘で顕在化し、driver 実装時の実機確認事項として NFR に明記
