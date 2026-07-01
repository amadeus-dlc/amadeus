# D001: Ideation 完了判断

## 背景

- [Issue #233](https://github.com/amadeus-dlc/amadeus/issues/233) は、自己開発 cycle の stage 判定と workspace 対応記録を定義することを求めている。
- Discovery は、この候補を最初に進める recommended 候補として扱っている。
- 先行 Intent `20260629-self-dev-steering-layer` の D002 は、Issue #233 を stage 判定と build workspace / target workspace の対応記録に限定する後続 Intent として扱う判断である。

## 判断

- Ideation gate passed として、この Intent を Inception へ進める。
- Inception では、stage 判定、stage0 採用判断、workspace 対応記録先を Requirement、Acceptance、Use Case、Unit、Bolt へ分解する。
- `CONTEXT.md` への stage0、stage1、stage2 の追加、example snapshot provenance、assets 混入検出は対象外として後続判断に残す。

## 理由

- Issue #233 の受け入れ条件は、要求と受け入れ状態へ分解できる粒度である。
- skill 実装、validator 実装、example snapshot 再生成は対象外として明示されており、Inception の範囲を stage 判定と workspace 対応記録へ限定できる。
- 既存の `.amadeus/glossary.md`、`.amadeus/steering/policies.md`、`.amadeus/development.md` に初期語彙と運用方針があり、Inception の入力として使える。

## 影響

- 後続の `amadeus-inception` では、User Stories の要否、Unit 境界、対応記録先を確認する。
- Construction では、確定した記録先に対する docs 更新または `.amadeus/` 更新を Task 化できる。
