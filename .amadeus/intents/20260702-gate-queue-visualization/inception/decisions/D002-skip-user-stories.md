# D002: User Stories の省略

## 背景

この Intent のアクターは ACT001 Maintainer（ゲート審査官として一覧を実行、確認する）と ACT002 Agent（並行作業中に一覧を実行して人間へ提示する）である。
人間アクターが存在するため、User Stories の要否を判断する必要がある。

## 判断

User Stories を省略する。

## 理由

アクター価値（承認の見落としと詰まりをなくす）は、要求 R002 と R003、およびユースケース UC001 から UC003 の相互作用で十分に表現できる。
一覧の実行と確認という単一の価値動線しかなく、ストーリーに分けると要求の言い換えになる。

## 影響

`state.json.inception.requiredStoryArtifacts` を空配列にする。
Use Case の `ストーリー` 参照は `なし` とする。
