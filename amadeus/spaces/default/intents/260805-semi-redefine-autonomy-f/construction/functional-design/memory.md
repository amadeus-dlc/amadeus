<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-08-05T10:12:30Z — [autonomy-statusline] autonomySegment の配置を component-methods.md §C14 の statusline 内関数から amadeus-lib.ts へ精密化(cid:code-generation:seam-placement-measured-module の執行、questions D1 に申告)。読み取り関数も extractField(statusline ローカル・非 export)→ getField(amadeus-lib.ts:4845)へ精密化(§12a it.2 FOLLOW-UP の申告追補)

- 2026-08-05T10:27:00Z — [launch-autonomy-flag] 上流未確定の分岐(active intent 不在時の --autonomy)を full autonomy の正規経路 amadeus-bolt decide-question で無人裁定(AUTO_DECIDED auto-decision-7bb5f69976f0c87168e4fa57ffb01bf6、選択 = loud-error-no-active-intent、solo-election 不在の loud degradation 記録)。本 intent の FD で decide-question 経路を使った初例

- 2026-08-05T10:48:00Z — [semi-authorization-core] units-generation §12a FOLLOW-UP の宙吊り(SemiAuthorityScope 組み立て結線)を ADR-3 裁定文からの機械導出で解消 — AutonomyDecisionInput への任意フィールド追加+authorizeInteraction 第3引数+production 組み立ての 3 点 specify(questions D3)

- 2026-08-05T11:55:00Z — [semi-docs-revision] C18 の ⚠(docs 22 ファイルの改訂行数未実測)を grep 全数実測で解消 — 64 行(en 32 + ja 32)を R13/P12/U39 へ分類。dual-key 第2キー走査(human-owned / only under full / autonomous Construction)で token `semi` 非含有の旧定義 4 箇所(06-hooks-and-tools en :48/:259、ja :46/:257 相当)を追加検出 — token 単キー目録では構造的に不可視だった。§12a iteration 1 READY、FOLLOW-UP 1件(ミラー14本の出典を codekb 単独依拠にせずコマンド出力転記を優先)は次 Unit 以降の起草規律として吸収

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-08-05T10:12:30Z — [autonomy-statusline] §12a iteration 1 BLOCKER: 初稿が C14 の返り値ドメイン(bare mode 名)と連結様式(呼び出し側 if 付き ` @` 前置)を無申告で変えていた — 3成果物+questions を C14 逐語契約へ整合是正し iteration 2 READY。教訓: 上流の verbatim シグネチャコメント(// "" | "semi" | ...)は返り値ドメインの契約であり、表示形と混同しない

- 2026-08-05T10:27:00Z — [launch-autonomy-flag] §12a iteration 1 BLOCKER: FR-CLI-5 後半(READ_ONLY_FLAGS 非追加)の AC にテスト固定表の検証手段が紐付いていなかった — H9(in-process アサーション)を追加して閉包。教訓: 静的な契約 AC にも必ず検証手段(テスト ID or 機械検査)を束ねる

- 2026-08-05T10:48:00Z — [semi-authorization-core] §12a iteration 1 BLOCKER: D3 の decide 内配線(semiScope 供給元)が未 specify で実装不能 — 実コード実測(decide :607 / AutonomyDecisionInput :228-239)に基づく 3 点 specify で閉包。教訓: 「〜経由で受領」の 1 文は配線の specify ではない — 型のフィールド・呼び出し行・組み立て点まで確定して初めて実装可能

- 2026-08-05T11:00:00Z — [advisory-auto-resolution] U-2(梯子3段縮退の許容可否)は delivery-planning が Bolt 1 ゲートへ回付済みのため FD は観測限定(R11)を厳守。U-3 のロック直列性は withAuditLock 4区間の所属関数実測(:518 提示 / :599 guard / :766 close / :787 受理)で設計前提を固定し、実装時実測義務は保持

- 2026-08-05T12:15:00Z — [stop-question-carveout] セッション断からの引き継ぎ監査で §12a Review 未実施を検出 — engine の unit covered 判定(成果物実在)は review 実施を保証しない(cid:code-generation:cg-handover-plan-audit のチェックボックス不信を per-unit stage の Review 節へ適用)。iteration 1 NOT-READY(BLOCKER 2 — 前セッション起草の未実測行範囲引用 allowlist :5265-5272 / t147:721-725)→ 実測 verbatim(:5268 / :5265-5275 / :721 / :723、HEAD 5f6561ee)へ 4 箇所是正+record 全域 grep 残存 0 → iteration 2 READY。§13 選挙 E-SRA-FDS13 は是正前に開票済みのため、本件(「引き継ぎ per-unit stage は全 unit の Review 節実在を監査してから gate へ進む」)は次回 §13 / ローリング PM の候補として diary に固定する

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
