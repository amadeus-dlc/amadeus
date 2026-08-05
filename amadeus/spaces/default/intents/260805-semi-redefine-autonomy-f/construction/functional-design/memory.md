<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-08-05T10:12:30Z — [autonomy-statusline] autonomySegment の配置を component-methods.md §C14 の statusline 内関数から amadeus-lib.ts へ精密化(cid:code-generation:seam-placement-measured-module の執行、questions D1 に申告)。読み取り関数も extractField(statusline ローカル・非 export)→ getField(amadeus-lib.ts:4845)へ精密化(§12a it.2 FOLLOW-UP の申告追補)

- 2026-08-05T10:27:00Z — [launch-autonomy-flag] 上流未確定の分岐(active intent 不在時の --autonomy)を full autonomy の正規経路 amadeus-bolt decide-question で無人裁定(AUTO_DECIDED auto-decision-7bb5f69976f0c87168e4fa57ffb01bf6、選択 = loud-error-no-active-intent、solo-election 不在の loud degradation 記録)。本 intent の FD で decide-question 経路を使った初例

- 2026-08-05T10:48:00Z — [semi-authorization-core] units-generation §12a FOLLOW-UP の宙吊り(SemiAuthorityScope 組み立て結線)を ADR-3 裁定文からの機械導出で解消 — AutonomyDecisionInput への任意フィールド追加+authorizeInteraction 第3引数+production 組み立ての 3 点 specify(questions D3)

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-08-05T10:12:30Z — [autonomy-statusline] §12a iteration 1 BLOCKER: 初稿が C14 の返り値ドメイン(bare mode 名)と連結様式(呼び出し側 if 付き ` @` 前置)を無申告で変えていた — 3成果物+questions を C14 逐語契約へ整合是正し iteration 2 READY。教訓: 上流の verbatim シグネチャコメント(// "" | "semi" | ...)は返り値ドメインの契約であり、表示形と混同しない

- 2026-08-05T10:27:00Z — [launch-autonomy-flag] §12a iteration 1 BLOCKER: FR-CLI-5 後半(READ_ONLY_FLAGS 非追加)の AC にテスト固定表の検証手段が紐付いていなかった — H9(in-process アサーション)を追加して閉包。教訓: 静的な契約 AC にも必ず検証手段(テスト ID or 機械検査)を束ねる

- 2026-08-05T10:48:00Z — [semi-authorization-core] §12a iteration 1 BLOCKER: D3 の decide 内配線(semiScope 供給元)が未 specify で実装不能 — 実コード実測(decide :607 / AutonomyDecisionInput :228-239)に基づく 3 点 specify で閉包。教訓: 「〜経由で受領」の 1 文は配線の specify ではない — 型のフィールド・呼び出し行・組み立て点まで確定して初めて実装可能

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
