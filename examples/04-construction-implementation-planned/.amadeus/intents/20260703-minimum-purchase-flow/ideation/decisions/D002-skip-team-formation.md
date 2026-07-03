# D002：Team Formation を実行しない

## 背景

Stage 1.5 Team Formation は、チーム構成、キャパシティ、mob 計画が意味を持つ場合だけ実行する。

## 判断

Team Formation を実行せず、`stages["team-formation"]` を `skipped` にする。

## 理由

開発は単独開発者で行うと人間の指示で確定した。
単独開発者では、チーム構成、キャパシティ、mob 計画の整理が判断材料にならない。

## 影響

team-assessment、skill-matrix、mob-composition の成果物は作らない。
承認の運用は、ステージ承認を会話内ゲート、phase と Bolt の確定を PR の人間 merge で行う。
