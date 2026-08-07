# Election Record — E-SSP-CGDEV

- question: 260807-subagent-start-pair Unit A（fix-2297-wiring）の逸脱裁定。builder が実装前停止: FR-A1（HOOK_PATHS へ log-subagent-start 追加）+ FR-A2（live へ PreToolUse 追加）は、許可ファイル集合外の tests/integration/hook-dispatcher.integration.test.ts が3重ピンする不変条件（KNOWN_SLUGS 10要素ハードコード・:112 の toHaveLength(11)・writeCompleteHookTree ヘルパーの10 slug 固定）と構造的に両立しない（注入実測: ベース 9 pass → 注入後 3 pass/6 fail、機序3種。波及は同1ファイルに限局 — 他の settings/hook 系 47+48 tests は注入状態でも green を実測）。builder は注入→赤→復元→残渣ゼロを1セット実施済みで作業ツリーは clean。requirements は「現10スロット」「既存11件」を事実引用するのみで同テストの改訂を未承認（c1-pinned-behavior-ruling 該当）。追加論点: テスト側で dispatcher 形 slug を basename 解決するには HOOK_PATHS の export（挙動不変）が要る。

裁定: 許可集合へ追加し HOOK_PATHS 導出形へ改訂(choice 1: 2票)
内訳: choice1=2票 choice2=0票 choice3=0票
- 留保(subagent-2, GoA2): 件数 assert :112 の 11 は HOOK_PATHS のキー数から一意には導出できない（11 = 10 slug + mint-presence の重複参照 1）。導出形へ改訂する際は重複分を式として明示し（例: KNOWN_SLUGS.length + 重複数、既存 :114 の mint-presence 2 件 assert を重複の所在ピンとして併用）、将来 2 つ目の重複 slug が現れた場合は手動更新が残る旨を成果物に明記すること — 全自動追随と主張しない。あわせて HOOK_PATHS の export 化は packages/framework/harness/claude/ 配下＝全 dist へ投影される面のため、挙動不変の実証として既存 dispatcher テストの再実行に加え bun run build による再生成と source-only 境界検査まで確認する。
- 留保(subagent-1, GoA2): テスト名そのものが件数語を持つ点を改訂範囲に含めること。tests/integration/hook-dispatcher.integration.test.ts:107 のテスト名は逐語 "settings route exactly 11 hook references through the fixed 10-slug table" で、KNOWN_SLUGS・:112 の assert を導出形へ改めても、この名前は手動更新しない限り陳腐化する(cid:code-generation:count-comment-sync-on-catalog-change の件数語クラス)。同一変更で count-free な名前へ改めるか、導出値から件数を組む。あわせて export の範囲は HOOK_PATHS のみに限り、parseHookSlug/resolveHookPath 等の内部ヘルパーは非 export のまま維持すること — 目的は slug 集合の canonical 化であって dispatcher 内部 API の公開ではない。
票タイムライン: 配信 2026-08-07T14:21:10Z → 配信 2026-08-07T14:21:10Z → subagent-2 2026-08-07T14:22:37Z → subagent-1 2026-08-07T14:22:47Z → 開票 2026-08-07T14:22:59Z
GoA[E-SSP-CGDEV]: 1x0 2x2 3x0 4x0 5x0 6x0 7x0 8x0
