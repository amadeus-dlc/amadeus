<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-07-26T05:58:00Z — doctor の 2 件の失敗(orphan worktrees / stale branches)はリポジトリ横断の既存ドリフトであり kimi arm とは無関係と解釈。計画の「現状に一致する結果」条項に従い dogfood 合格とした
- 2026-07-26T05:58:00Z — セッション先頭の `dogfood-hook-check ok` 往復は hook 発火確認(Q1 手順)の一部と解釈。doctor の Hooks last fired と audit の HUMAN_TURN で裏付け済み

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-07-26T05:58:00Z — 生成本体(Step 1-2 のコードとテスト)は前セッションで実装済みだったため、本セッションは検証(dist/drift guard・テスト・typecheck/lint・dogfood)と成果物クローズに集中。計画のチェックボックスは検証パス後に一括で [x] 化した

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-07-26T05:58:00Z — テストは全量ではなく `--filter "setup-|plugin-projection|t227"` の対象絞り込みで実行。unit 固有の検証に十分で、全量は build-and-test ステージの責務と判断

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- 2026-07-26T05:58:00Z — state の Scope が `amadeus-feature` と不正値で engine が hard error していた事象。`amadeus-state.ts set Scope=feature` で修正済みだが、どの経路で不正値が書き込まれたかは未特定。再発するようなら別途 bugfix intent で追う

- 2026-07-26T07:00:00Z — Interpretations: 各 unit の plan は conductor 作成・worker 実装の分担とし、チェックボックスは完了時に必ず更新(3度の失念を経て徹底)
- 2026-07-26T07:00:00Z — Tradeoffs: 実機発見(docs と実機の乖離)を設計に即時反映させる流れが有効に働いた(B2 の payload 差異・CLI のコメント除去 → B3 の二重識別・B4 の advisory 判定・B6 の認証供給)
- 2026-07-26T07:00:00Z — Interpretations: cli.ts 配線は B3 が公開契約として設計し B5 が接続する分業で、unit 境界の曖昧さを避けられた
- 2026-07-26T07:00:00Z — Open questions: state の Scope 表示が feature に正規化されている点(ルーティングは変わらず)は build-and-test 後に観察を続ける

- 2026-07-26T07:10:00Z — Deviations: B5 の dogfood セッションが engine の hard error(root .kimi-code ツリーの scope-grid に合成スコープがないため)を `set Scope=feature` で自己修復していた事象を検出。conductor が `set Scope=amadeus-feature` で復元(2026-07-26T07:10Z)。ルーティングは常に18ステージ集合どおりで実害なし。根本原因は dogfood 側ツリーに project スコープが同梱されない構造(エンドユーザーには影響なし)で、B5 の申し送りどおり
