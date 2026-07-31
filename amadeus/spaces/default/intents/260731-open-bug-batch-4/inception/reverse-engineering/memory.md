<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-07-31T05:50:00Z — 差分 base は前 intent の observed `3f73823b1`(祖先実測 exit 0・距離13)を採用、observed は origin/main の `6e7a9d701`(rescan-base-ancestry / c2-observed-mainline-commit 準拠)。既存 open PR は4件とも 0 件を起動前に実測(c1-preexisting-pr-inventory)。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-07-31T05:50:30Z — 宣言センサーは codekb 出力に filter 構造不適合のため機械検査で代替(re-sensors-codekb-filter-mismatch / c3-codekb-sensor): 全10ファイル非0バイト・H2≥8・競合マーカー 0 を実測。Developer→Architect の2段で引用全件一致、数値4クラス(コミット数13・numstat 合算→insertions 単独へ是正・行範囲精密化・allowlist 交差2件へ縮小)は Architect 実測値を成果物に採用。

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- 2026-07-31T05:51:00Z — #1816 の「record main 着地前 close」は PR #1689 設計帰結+t361:262 契約固定 = 仕様裁定マター(c1-pinned-behavior-ruling)。requirements で表示層限定スコープの申告+仕様側の扱いをユーザーへ諮る。
- 2026-07-31T05:51:20Z — #1800 は負荷依存で決定的再現が不確実 — 再現不能時の受理条件(診断対称化+限定リトライを「機序一次確定可能化」と位置づけるか)を requirements で明示(no-silent-scope-narrowing)。
- 2026-07-31T05:51:40Z — #1797 の閾値・方式は負荷スイープ実測から導出(数値は要件で固定しない)。#1811 着地が #1800/#1797 の再現条件を変える依存 — スイープ実測の時点を requirements で固定。テスト採番予約: t374(#1811)/t375(#1800)/t376(#1797)、#1816 は t281 追加。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
