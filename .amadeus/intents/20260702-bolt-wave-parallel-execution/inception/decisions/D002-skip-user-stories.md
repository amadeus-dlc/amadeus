# D002: User Stories の省略

## 背景

この Intent のアクターは ACT001 Maintainer（wave 単位のまとめ承認を行うゲート審査官）と ACT002 Agent（wave を導出して並行実行する実行者）である。
人間アクターが存在するため、User Stories の要否を判断する必要がある。

## 判断

User Stories を省略する。

## 理由

アクター価値（Intent 内の並行加速）は、要求 R001 から R004 とユースケース UC001 から UC004 の相互作用で十分に表現できる。
wave の導出と実行という単一の価値動線しかなく、ストーリーに分けると要求の言い換えになる。

## 影響

`state.json.inception.requiredStoryArtifacts` を空配列にする。
Use Case の `ストーリー` 参照は `なし` とする。
