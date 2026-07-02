# D003: User Stories の省略と粒度例外

## 背景

ピラミッド構造では、User Story は人間アクターのユーザー価値表現が必要な場合だけ作る。
また、下位成果物が上位成果物と常に 1:1 になる場合は分割不足を疑う必要がある。

## 判断

User Stories を省略する。
Intent:Unit の 1:1 を例外として認める。

## 理由

- 相互作用の主体は Agent と validator であり、Maintainer は配置先判断（G001）の判断者として登場する。スクリプトと手順の契約作業にユーザー価値の物語表現は不要である。
- 雛形の生成契約、配置、手順参照、検証は「validator の契約から state を生成する」という単一の価値で結ばれており、分割すると生成契約（スクリプト）と利用（手順参照）の間で責務の受け渡しが増える。同種の判断は Intent 20260702-construction-finalization-resume（検出スクリプトと手順統合を単一 Unit で扱う）でも例外として認められている。
- Bolt は B001（スクリプトと eval）と B002（手順参照と promote）の 2 つに分割しており、Unit 内では 1:1 になっていない。

## 後で分割を見直す条件

- 雛形の対象が state.json 以外の成果物へ広がる場合は、生成対象ごとの Unit 分割を見直す。

## 影響

`state.json.inception.requiredStoryArtifacts` は空配列にする。
