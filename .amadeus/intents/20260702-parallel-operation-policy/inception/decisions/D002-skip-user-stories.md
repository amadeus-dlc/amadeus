# D002: User Stories の省略

## 背景

この Intent のアクターは ACT001 Maintainer（並行判断と承認運用の主要利用者）と ACT002 Agent（policy を根拠に並行作業を進める実行者）である。
人間アクターが存在するため、User Stories の要否を判断する必要がある。

## 判断

User Stories を省略する。

## 理由

アクター価値（並行運用の判断を都度判断から policy 根拠へ変える）は、要求 R001 から R005 とユースケース UC001 から UC004 の相互作用で十分に表現できる。
policy の参照と判断という単一の価値動線しかなく、ストーリーに分けると要求の言い換えになる。

## 影響

`state.json.inception.requiredStoryArtifacts` を空配列にする。
Use Case の `ストーリー` 参照は `なし` とする。
