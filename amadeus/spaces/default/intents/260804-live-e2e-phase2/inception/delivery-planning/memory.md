# Delivery Planning Memory

## Interpretations

- 2026-08-04T12:42:35Z — Issue・Requirements・Application Design・Units Generationで確定済みのtransport境界は再質問しない; Delivery Planning固有の経済順序だけを人間判断として確認する。
- 2026-08-04T12:42:35Z — self-featureの新しい検証経路なのでWalking Skeletonを必須とする; team.mdの規則に従い、最大リスクを端から端まで通す最初のBoltを単独・ゲート付きにする。

## Deviations

## Tradeoffs

- 2026-08-04T12:42:35Z — 1 Unit = 1 Boltを既定案とする; transport vertical sliceの完了境界を壊さず、独立PR・review・rollbackを維持するため。
- 2026-08-04T12:44:12Z — ユーザー裁定AでKiro TUI risk-firstを採用した; 最大のinteractive process・tmux・cleanup不確実性を単独Walking Skeletonで最初にconnected/follow-upまで閉じる。

## Open questions

- 2026-08-04T12:42:35Z — Kiro ACP/TUIのdirect実装とfollow-up branchでは規模が異なる; Delivery Planning成果物で分岐別レンジを固定する。
- 2026-08-04T12:42:35Z — U1〜U3はDAG上並行可能だがregistry・projector・serial test等の共有file contentionが見込まれる; Construction着手前の対象file目録と先行Bolt実diffで並行可否を再判定する。
