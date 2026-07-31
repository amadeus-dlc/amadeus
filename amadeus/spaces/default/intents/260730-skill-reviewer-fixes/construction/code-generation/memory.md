<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
2026-07-30T14:27:57Z — Bolt 2 の実装は unitDirsUnderConstruction(construction/ 直下からステージ slug 集合を減算)で unit を導出し、一意なら解決 emit、0件/複数件は候補列挙付き fail-closed error。契約変更(t186/t116)は裁定 Q1=A の申告付き。allowlist 38 ピン機械 remap+バイト同一直読、追加46測定可能行は in-process 被覆で新規 allowlist 0。§12a は両 unit とも iteration 1 READY。
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
2026-07-30T15:14:24Z — builder-1711 の遅着報告(14:44Z)を吸収: (1) 落ちる実証は builder が明示注入で実施済み(t367 0/9→復元 9/9、症状逐語一致)— code-summary の記述を実測どおりへ是正 (2) 運用帰結の明文化 = degrade スコープ Construction 初回 next は unit ディレクトリ未作成なら fail-closed refuse(FR-2b 設計どおり、t118/t120/t247 の seed 是正の理由)。push/PR/検証は conductor 引き取り分と矛盾なし(late-verdict-diff-absorption)。
2026-07-30T14:27:57Z — u2 レビュー Minor: .codex scope-grid のキー順 churn(#1734 既知)が Bolt 2 PR に同乗 → Bolt 1 と同基準(surgical)で除外コミット 4a03e06de を追加 push。promote:self:check / dist:check green を除外後に再実測。
2026-07-30T14:27:57Z — builder-1711 が実装コミット後、push/PR/報告の配送前に停止(spawned-agent-result-delivery クラス)。conductor が disk-evidence-early-takeover で引き取り(worktree クリーン・コミット実在を実測 → diff stat 検分 → push → PR #1760 作成)。ユーザー指摘「先に push して PR 作れ」が引き取りの契機。
2026-07-30T13:48:00Z — 並行 Bolt 実行中、builder-1736 の PR 発行報告(bolt-1736-report.md、PR #1753 URL 含む)がディスクに実在したのに、Bolt 2 の完了同期待ちループへ先に入り、ユーザー指摘(「#1753マージできるのに #1711 を待っているの?」)で気づいた。是正後は PR 収束確認→承認伺い→マージを即時処理し Bolt 2 待ちへ復帰。§13 候補: 「PR 発行報告の受領は他 Bolt 完了待ちより先に処理する割込みイベント」規則の persist 要否+statusline 表示の enhancement 起票要否。
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
