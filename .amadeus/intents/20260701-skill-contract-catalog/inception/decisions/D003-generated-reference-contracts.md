# D003: Skill Contract 参照文書を生成物として扱う

## 背景

Issue #263 は、`skills/amadeus-*/references/skill-contract.md` を生成参照できるようにすることを求めている。

一方で、手書きの `references/skill-contract.md` を許すと、TypeScript catalog と配布先参照文書のずれが発生する。

## 判断

`references/skill-contract.md` は手書きではなく、`amadeus-contracts/catalog/**` から生成する。

直接編集は禁止し、変更は Skill Contract catalog を更新してから `contracts:generate` で反映する。

## 理由

Skill Contract は validator、evaluator、decision review、learning review が共有する入力である。
配布先ごとに手書きすると、review の根拠が skill ごとに分散し、`contracts:check` でずれを検出できない。

## 影響

Construction では、生成物の先頭に直接編集禁止を明記する。

`contracts:check` は `references/skill-contract.md` の欠落と差分を検出する。
