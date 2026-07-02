# D002: User Stories の省略

## 背景

User Stories は、人間アクターのユーザー価値表現が必要な場合だけ作る。

## 判断

この Intent では User Stories を作らない。

## 理由

相互作用の主体は Agent（モジュール記述と再生成の実行）と validator（不整合の検出）であり、システムの相互作用として Use Cases で表現できる。
人間の Maintainer は生成された差分のレビューと承認で関与し、独立したユーザー価値表現を必要としない。
同型の先例（Intent 20260702-state-json-scaffolding）でも User Stories を省略している。

## 影響

`state.json.inception.requiredStoryArtifacts` を空配列にする。
Use Cases の Story 参照は `なし` にする。
