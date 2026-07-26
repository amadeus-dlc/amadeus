<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-07-26T13:55:00Z — 旧 Issue #1543 本文をユーザー起草の確定裁定とみなし、intent-capture:c1 に従って質問を未決3点(epic 範囲・ミラー・activation policy 裁定タイミング)に絞った; Q2/Q3 の「コメントしたとおり」は Q1 裁定(intent-first・#1543 破棄可・1 intent・Unit で吸収)からの導出として記録
- 2026-07-26T13:55:30Z — Q3 裁定「本 intent 内で完結」を選択肢 A(application-design の ADR + 承認ゲートで裁定)へ写像した; 方向性の先決めや別 intent 切り出しはユーザー発言に現れないため

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- 2026-07-26T13:56:00Z — Intent Mirror create が invalid-response で pending(operationId 15fe16c5)。intent-statement 生成後に再試行し、成立後に旧 #1543 のクローズをユーザーへ確認する(自動クローズはしない — provenance なし Issue の auto-close 禁止 Forbidden)
- 2026-07-26T14:00:00Z — 再試行も同一失敗。根因を実測特定: gh 2.96 の envelope を parseHttpEnvelope が malformed 扱い。Issue #1544 起票 → **ユーザー指摘で #1498 の重複と判明**(修正 PR #1537 は main 着地済み・本ブランチ未取込)。#1544 は重複クローズ、origin/main を --no-ff マージで取込(intents.json 衝突は dirName 和集合で解消、マーカー0・parse ok・parent2 実測)
- 2026-07-26T14:10:00Z — 取込後の create は成功(Mirror Issue #1545、v1 ブロックに provenance 永続化)。ただし status が mirror-missing 偽陰性 → 深掘りで write⇔read 表現分裂を確定(lifecycle は v1 ブロックのみ書く/status・重複ガードは legacy「Mirror Issue」フィールド(amadeus-mirror.ts:169)を読む)。Issue #1547 起票(bug/P2/S3、#1534 の対面)。ミラー自体は健全にリンク済み — 孤児ではない。旧 #1543 のクローズ可否はゲートでユーザーへ確認
