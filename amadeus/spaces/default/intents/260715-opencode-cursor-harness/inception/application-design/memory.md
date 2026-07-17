<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
- 2026-07-15T17:35:49Z — AC-3d の外部実測で Cursor hooks の実在を確認(v1.7〜、.cursor/hooks.json、イベントは Claude 集合とほぼ1:1)— R-1 の前提『不在』を反証し、設計は hooks 写像(ADR-3)へ転換。cloud/CLI の非対応イベント(sessionStart/sessionEnd)のみが機能差として残る
- 2026-07-15T17:35:49Z — AC-1b の意味論適合照合を実施: emit 契約は fail-fast(package.ts:459-461 try/catch なし)で本要件と一致、意図的相違ゼロ(ADR-4 に記録)
- 2026-07-15T17:35:49Z — 明確化質問ファイルは作成しなかった; 設計判断はすべて E-OC7 裁定・実測・既決からの導出で、真に未決の判断は不在(ADR-1〜5 の Alternatives Rejected で選択根拠を保存)
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
- 2026-07-15T17:48:27Z — reviewer iteration 1 = REVISE(GoA 7、Critical 2: authoredExempt 必須フィールド欠落(package.ts:668 即クラッシュ)/ emit の write⇔check 対称欠落、Major 2: Cursor tool_name 未実測の過剰確約 / AC-5c 目録未添付、Minor 2)→ 6件全是正 → iteration 2 = READY(GoA 1、verbatim 閉包確認)。学び候補: 外部 seam は『存在の実測』と『語彙(tool_name 等)の実測』が別物 — 存在確認だけで機能表に確約(✅)を書かない
- 2026-07-15T17:48:27Z — reviewer が iteration 2 の Review セクションを components.md 末尾へ直接追記した(依頼は読み取り専用だった)— 記録として有害でないため保持するが、次回は verdict を最終テキストのみで受け取り conductor が記録先を決める
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
- 2026-07-15T17:35:49Z — opencode の hooks(plugins)統合を初期スコープ外にした(ADR-3): walking-skeleton 規律の最小性を優先し、Cursor は seam 実在の実測があるため対応、opencode は将来 Issue — 非対称だが実測に基づく非対称で、機能表に明示する
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
