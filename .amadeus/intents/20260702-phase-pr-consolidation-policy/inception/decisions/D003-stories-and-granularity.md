# D003: User Stories の省略と粒度例外

## 背景

ピラミッド構造では、User Story は人間アクターのユーザー価値表現が必要な場合だけ作る。
また、下位成果物が上位成果物と常に 1:1 になる場合は分割不足を疑う必要がある。

## 判断

User Stories を省略する。
Intent:Unit の 1:1 を例外として認める。

## 理由

- Reviewer と Maintainer は UC003 の相互作用として登場するが、policy の契約作業にユーザー価値の物語表現は不要である。
- 統合条件、単位、記録、整合は「gate を弱めずに PR 往復を減らす」という単一の価値で結ばれており、分割すると条件と記録の間で契約の受け渡しが増える。同種の判断は Intent 20260702-skill-change-review-contract（policy 契約を単一 Unit で扱う）でも例外として認められている。
- Bolt は B001（policy 追記）と B002（整合補正）の 2 つに分割しており、Unit 内では 1:1 になっていない。

## 後で分割を見直す条件

- 統合条件の適用対象が仕様側以外へ広がる場合は、対象ごとの Unit 分割を見直す。

## 影響

`state.json.inception.requiredStoryArtifacts` は空配列にする。
