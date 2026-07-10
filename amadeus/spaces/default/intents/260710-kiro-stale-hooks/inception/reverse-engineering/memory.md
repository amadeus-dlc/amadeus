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

- 2026-07-10 [Interpretation] 既存 codekb あり → cid:reverse-engineering:c1 に従い diff-refresh(base=24197d755 前 intent observed、observed=HEAD e1a07fad)。事前確認で差分 13 ファイルはいずれも #719 フォーカス面(harness/kiro、manifest.ts、scripts/package.ts orphan スキャン)に非関与。
- 2026-07-10 [Interpretation] cid:reverse-engineering:c3 に従い Developer(スキャン)→ Architect(合成)の直列 2 サブエージェント構成で実行。
- 2026-07-10 [Deviation] intent-birth 時に engine が既存 13 intent の cursor 未選択 ask を返したが、本件は leader 指示の意図的な新規 intent のため intent-birth を直接実行(重複 birth ガードの正当なバイパス、ask の趣旨である人間判断は leader ディスパッチで充足)。
- 2026-07-10 [Interpretation] Developer スキャン完了: 2層マスキングを file:line で確定(1層目 = scripts/package.ts checkHarness :554-633 が dist のみ walk、source 検査機構不在。2層目 = harness/kiro/manifest.ts:81 の空振り .kiro.hook exemption)。source 7件は登録・出荷とも dead、t147/t148 は dist のみ参照で削除安全。
- 2026-07-10 [Tradeoff] codekb 更新は 2件(code-quality-assessment + 鮮度ポインタ)に限定し 7件温存 — 差分13ファイルがフォーカス面非関与のため。あわせて #701 記述の stale 行番号を是正(ボーイスカウト、codekb 内の記述整合)。
