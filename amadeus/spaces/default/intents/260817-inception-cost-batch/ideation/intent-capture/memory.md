<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-08-17T17:57:27Z — 質問ゼロ・モード選択省略で実行; 本ステージ4トピックは Issue 本文+クロスレビュー+本セッションのユーザー裁定で全て既決のため、project.md cid:requirements-analysis:c5(既決事項の再質問禁止)を stage prose の質問フローより優先し、質問ファイルは裁定 provenance の記録(blank 0件)として作成した

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-08-17T17:57:27Z — 承認済み compose プランでは intent-capture は SKIP だったが、birth 時点でカーソルが本ステージ in-progress となり recompose の対象外(PENDING のみ反転可)と判明; 薄い実行(既決事項の記録のみ)へ切替。intent-statement は RA が consume するため実害なし
- 2026-08-17T17:57:27Z — 同プランの functional-design SKIP も recompose が拒否(self-feature の walking-skeleton ゲートアンカーが Construction 最初の EXECUTE ステージに固定されるため); engine の案内に従い「AD ゲート時点で jump するか」の判断へ変更(ユーザー承認済みの趣旨 = 決めきれない場合のみ FD 実行、は保存)

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-08-17T17:57:27Z — 一時スコープを mint せずストック self-feature + recompose を採用(composer 提案どおり); 削除申し送りの管理自体が不要になり、ユーザー指示「一時スコープは後で消す」は temp scope 未作成(削除対象なし)として構造的に discharge

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- 2026-08-17T17:57:27Z — functional-design の jump 可否は application-design の decisions が #3181 取り込み機構のデータ形状まで決めきれたかで AD ゲート時に判断する
- 2026-08-17T17:57:27Z — mirror initial-create は GitHub 503 で retry 状態(operationId 3ac574d9-45db-4c22-a739-a450ffb72a15)。#3181 の in-progress ラベル付与も未達 — 後続 boundary の retry で回復想定、恒久失敗なら可視記録のまま継続(fail-open ノルム)
