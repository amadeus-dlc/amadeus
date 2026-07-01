# D001: Inception 境界

## 背景

この Intent は、`amadeus-*` skill を `skill-forge` で確認し、README の公開入口説明と内部 skill の扱いがずれないようにすることを扱う。

README は skill を Phase Skills、Cross-Cutting Support Skills、Internal Skills に分けて説明している。
一方で、repo には多数の内部 `amadeus-*` skill が存在する。

## 判断

Inception の対象境界を README と `amadeus-*` skill の skill-forge 確認に固定する。

README 以外の docs 全面再構成、`skill-forge` 本体変更、`amadeus-*` skill の一括リライト、validator 契約の破壊的変更、example snapshot の一括再生成は対象外にする。

## 理由

Ideation の対象境界は、README 分類、skill-forge 確認観点、source skill と昇格先成果物、互換性境界、検証条件に絞られている。

この範囲は Inception で要求、ユースケース、Unit、Bolt に分解できる。

## 影響

Construction では、README 分類、skill-forge 確認範囲、source skill と昇格先成果物の差分、互換性判断、検証条件を Task 化する。

目的と異なる全面再構成や一括リライトが必要だと分かった場合は、後続 Intent 候補として分ける。
