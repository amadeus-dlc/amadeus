# Election Record — E-RE-2695-LEARNINGS

- question: Reverse Engineering の学習候補から、次回以降の project practice として最も価値の高い1件を選ぶ

裁定: attribution eligibilityを分離(choice 6 — tie 裁定)
- 留保(reverse-engineering-voter-1, GoA2): measured population を不変に保てる明示的な eligibility 判定境界がある場合に限り採用し、境界を定義できない場合は集計せず観測欠損として扱う。
- 留保(reverse-engineering-voter-2, GoA2): この学習は帰属・監査・再計算の正本を raw journal に置く範囲に限定し、runtime graph は運用上の projection として維持すること。journal 側の event identity・順序・canonical dedup 境界を明示し、欠落や曖昧な対応は推測で補わず fail-closed にすること。
票タイムライン: 配信 2026-08-09T13:48:03Z → 配信 2026-08-09T13:48:03Z → reverse-engineering-voter-1 2026-08-09T13:49:35Z → reverse-engineering-voter-2 2026-08-09T13:49:39Z → 開票 2026-08-09T13:49:56Z
GoA[E-RE-2695-LEARNINGS]: 1x0 2x2 3x0 4x0 5x0 6x0 7x0 8x0

- hold 裁定履歴: tie → choice:6(2026-08-09T13:50:48Z、復帰先 tallied)
