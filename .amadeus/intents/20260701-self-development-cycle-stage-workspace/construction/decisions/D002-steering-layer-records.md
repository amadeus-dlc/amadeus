# D002 stage と workspace 対応記録を既存 steering layer に追加する

## 状態

active

## 背景

Issue #233 は、stage0、stage1、stage2 の意味と、build workspace、host environment、target workspace、target artifacts の対応記録を後続 Intent から追跡できる状態にすることを求めている。
Inception では、B001 が stage 方針記録、B002 が workspace provenance 記録を扱うと決めた。

## 決定

stage0 採用条件と stage0 採用判断は `.amadeus/glossary.md` と `.amadeus/steering/policies.md` に記録する。
workspace 対応記録と検証証拠の記録先は `.amadeus/development.md` に記録する。
machine-readable evidence 形式はこの Construction では導入しない。

## 根拠

- [B001 tasks](../bolts/B001-stage-policy-record/tasks.md)
- [B002 tasks](../bolts/B002-workspace-provenance-record/tasks.md)
- [B001 test-results](../bolts/B001-stage-policy-record/test-results.md)
- [B002 test-results](../bolts/B002-workspace-provenance-record/test-results.md)

## 影響

後続 Intent は、PR 準備条件と対象 Intent の追跡成果物から stage 判定と workspace 対応記録を確認できる。
`CONTEXT.md` への stage 語彙昇格は後続判断に残る。
