# D001: complete ideation

## 背景

Issue #306 と #307 は、Task Generation Gate の人間承認と grilling 起動がハーネスによって実行されない迂回路と、承認 evidence を検査しない validator の不足を扱う。

## 判断

Ideation を完了し、Inception へ進める。

Inception では、迂回路ごとの契約変更箇所、grilling トリガーの判定形式、approval evidence の構造、eval の置き場所を具体化する。

## 理由

Issue #306 と #307 の対象、対象外、受け入れ条件と、Discovery の確定判断から、対象境界、実行スコープ、成果物深度、検証戦略を判断できる。
残る未確定事項 5 件は、Inception の要求化と既存 skill、validator、実データの分析で扱える。

## 影響

Inception では、approval evidence の構造を既存の examples と `.amadeus/intents/**` の実データから最初に確定する。
