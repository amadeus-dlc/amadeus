# D001: complete ideation

## 背景

Issue #296 は、`.amadeus/steering/policies.md` が定める provenance の最低記録項目が手書き Markdown であり、もっともらしく間違った値（md5、commit）でも validator を pass する問題を扱う。
自己開発の残存リスクを詰めた grilling session（2026-07-02）で、生成の機械化と検証の機械化を2段階として扱う判断が確定している。
Discovery `20260702-evidence-record-and-evaluation` の候補判断では、この Intent を recommended 候補（GD001）として最初に Ideation へ進める依存順が確定している。

## 判断

Ideation を完了し、Inception へ進める。

Inception では、provenance 記録の置き場所、JSON スキーマの項目構成、既存 Intent への遡及適用の要否と範囲、amadeus-validator との連携範囲、`examples/skill-provenance.json` との関係整理を具体化する。

## 理由

Issue #296 の実施候補、受け入れ条件と Discovery の候補判断から、対象境界、実行スコープ、成果物深度、検証戦略を判断できる。
残る未確定事項 5 件は、Inception の要求化と既存コード分析（dev-scripts の配置方式、policies.md の最低記録項目、既存 Intent の provenance 記録実データ）で扱える。

## 影響

Inception では、provenance 記録の置き場所を最初に確定する。
