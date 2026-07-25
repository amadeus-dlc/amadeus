<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
- 2026-07-25T15:25Z — U2 の信頼性で最優先は R-4(走査範囲の安全性)であり R-1(部分失敗からの回復)より上に置いた。**誤って消す方が、消し残すより有害**だからである。台帳から実在走査へ変えることで削除対象の決定根拠がメモリからファイルシステムへ移るため、範囲限定が要件になる。
- 2026-07-25T15:25Z — SC-2 に「メンバー数ぶん並列にするのが最も自然に見えて最も遅い」と明記した。並列度7(= 7人構成でメンバー数ぶん fan-out)は 7.55秒 で直列 7.39秒 より遅いという実測は直感に反するため、要件として言語化しないと実装時に「メンバー数に追随させる」案が復活しうる。
- 2026-07-25T15:25Z — R-7 で「git のロック競合は失敗にならない → リトライ機構は不要」と明記した。存在しない問題への対策を足さないため(org.md Forbidden の要求外機構)。
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
- 2026-07-25T15:25Z — SC-4(U1)と SC-2/SC-3(U2)で、常駐サービス向けの軸(水平スケール・ロードバランシング・キャッシュ)を「非対象」として明示的に退けた(cid:nfr-design:c1)。理由を書かずに省略すると、後続で機械的に追加されうるため。
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
- 2026-07-25T15:25Z — U2 の SC-3 で「並列度の上限はリポジトリ規模に依存しない固定値とする」とした。worktree 作成時間はリポジトリ規模に比例するが、最適並列度を決めるのは I/O とロックの競合であり規模ではない、という判断。実測は本リポジトリ1点のみのため、この判断自体が仮説である点は RAID R-6 として残る。
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
- 2026-07-25T15:25Z — SC-3 の非対象に挙げた「複数チームの同時起動時の git ロック競合」は実測外。`--instance` で分離される既存機能だが、別チームが同時に worktree を作ると競合が増えうる。本 intent のスコープ外とした。
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
