# D003: User Stories の省略と粒度例外

## 背景

ピラミッド構造では、User Story は人間アクターのユーザー価値表現が必要な場合だけ作る。
また、下位成果物が上位成果物と常に 1:1 になる場合は分割不足を疑う必要がある。

## 判断

User Stories を省略する。
U002:B003 の 1:1 を例外として認める。

## 理由

- 相互作用の主体は Agent と validator であり、Maintainer は UC001 の承認者として登場する。skill と validator の契約変更にユーザー価値の物語表現は不要である。
- U002 は「approval evidence の検査」という単一の検査追加であり、eval 先行と実装と昇格同期は 1 つの変更単位（B003）として自然である。分割すると RED と GREEN が別 PR に分かれ、dev-scripts ルールの検証単位と合わなくなる。
- U001 は B001（実装ゲート）と B002（トリガーと scaffold-only 条件）の 2 Bolt に分割しており、Intent 全体では 1:1 になっていない。

## 後で分割を見直す条件

- B003 の変更量が 1 PR のレビュー粒度制約を超える場合は、eval 追加と検査実装を分割する。

## 影響

`state.json.inception.requiredStoryArtifacts` は空配列にする。
