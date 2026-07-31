<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-07-31T07:50:00Z — 4 Bolt を初の並行ディスパッチで実行(worktree 隔離×4、FR 全文焼き込み); record 側処理(unit dir 作成→directive 捕捉→成果物→§12a)は uncovered-unique 制約に合わせ conductor が完了順に直列処理(c1-degrade-batch-directive-capture の並行版運用)。PR 発行報告は割込み優先で処理(E-SRF-CGS13)。
- 2026-07-31T07:50:30Z — Bolt D の逸脱停止(compareMirrorStatus の第2比較面 currentStatus 未導出)を選挙 E-OBB4-CG1 で裁定(案1 採用 2-0)し、FR-4b' を requirements へ申告付きで追記のうえ builder を SendMessage 再開(worktree 明示パス+git 操作限定の再掲 = c2 追補準拠)。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-07-31T07:51:00Z — Bolt D の FR-4a 表示層限定からの逸脱は選挙裁定経由で FR-4b' として正規化(実装前停止 → E-OBB4-CG1 → 裁定準拠実装 → §12a 検証済み)。無申告逸脱ではない。

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-07-31T07:51:30Z — マージ順は完了順(#1811→#1800→#1797→#1816); #1811 先行着地は他 flake の背景要因低減を兼ねる(priority-vs-dependency の依存層)。副次起票: #1830(t258 flake、Bolt C が dup 確認込みで起票)・#1833(mirror landing ノルム乖離、FR-4c 申し送り)。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
