# ADR 0002: Intent Phase Directory Layout を採用する

## ステータス

採用。

## 日付

2026-06-29。

## 背景

Amadeus DLC の Intent layer は、Intent の目的、要求、受け入れ状態、ユースケース、Unit、Bolt、Task、判断、追跡を扱う。

現行の生成物と skill には、`scope.md`、`requirements.md`、`acceptance.md`、`traceability.md`、`decisions.md`、`domain/` を Intent のモジュールディレクトリ直下に置く前提が残っている。

一方で、AI-DLC v2 の Intent record は、Intent record 直下に状態ファイルを置き、phase ごとのディレクトリとして `initialization/`、`ideation/`、`inception/`、`construction/`、`operation/` などを分ける。

Amadeus DLC でも、phase ごとの成果物境界、gate、traceability、validator の責務を分けるには、Intent のモジュールディレクトリ直下にすべてを並べる配置よりも、phase ごとのディレクトリを標準化する方が明確である。

この判断は `grill-me` による設計確認で確定し、GitHub Issue [#104](https://github.com/j5ik2o/amadeus/issues/104) に最終記録を残した。

古い HEAD を前提に作成した GitHub Issue [#103](https://github.com/j5ik2o/amadeus/issues/103) は、最新 HEAD の文書構造と合わないため閉じた。

## 決定

Intent layer では、**Intent Phase Directory Layout（Intent phase ディレクトリ配置）**を採用する。

Intent のモジュールファイルは、引き続き `.amadeus/intents/<intent-id>-<slug>.md` に置く。

Intent のモジュールディレクトリは、引き続き `.amadeus/intents/<intent-id>-<slug>/` に置く。

`state.json` は、Intent 全体の lifecycle 状態を示すため、Intent のモジュールディレクトリ直下に置く。

phase ごとの成果物は、Intent のモジュールディレクトリ配下の phase ディレクトリに置く。

標準 phase ディレクトリは次である。

```text
.amadeus/intents/<intent-id>-<slug>.md
.amadeus/intents/<intent-id>-<slug>/
  state.json
  initialization/
  ideation/
  inception/
  construction/
```

`operation/` は将来 phase 名として予約する。

ただし、Operation 成果物は対応 skill が確定するまで固定しない。

そのため、現時点では `operation/` を必須成果物配置や validator 必須対象に含めない。

`initialized/` は作らない。

Phase 0 のディレクトリ名は、本家 AI-DLC v2 に合わせて `initialization/` とする。

`initialization/` には Intent 登録層の補助成果物だけを置く。

Intent のモジュールファイルと `state.json` は `initialization/` に移さない。

`traceability.md` と `decisions.md` は phase ごとに分離する。

たとえば、Ideation の追跡と判断は `ideation/traceability.md` と `ideation/decisions.md` に置き、Inception の追跡と判断は `inception/traceability.md` と `inception/decisions.md` に置く。

`acceptance.md` は Inception の成果物として `inception/acceptance.md` に置く。

Construction は `inception/acceptance.md` の受け入れ状態と証拠を更新する。

Intent 固有の Domain Model と Intent Contracts は、Inception の設計根拠として `inception/domain/` に置く。

Grilling Decision Trail は、反映先と同じ成果物境界に置く。

Intent 登録層の判断は `initialization/grillings.md` と `initialization/grillings/` に置く。

Ideation の判断は `ideation/grillings.md` と `ideation/grillings/` に置く。

Inception の判断は `inception/grillings.md` と `inception/grillings/` に置く。

Construction の判断は `construction/grillings.md` と `construction/grillings/` に置く。

旧配置との後方互換は残さない。

`docs/backward-compatibility.md` に記録された互換性維持対象が存在しない限り、validator、template、skill、examples は新しい配置契約へ寄せる。

## 非目標

この ADR では validator を実装しない。

この ADR では template を移動しない。

この ADR では skill の生成先を変更しない。

この ADR では examples を再生成しない。

この ADR では `state.json.phase` の値を変更しない。

この ADR では Operation 成果物を定義しない。

この ADR では `initialization/registration.md` を必須成果物にするかを決めない。

## 根拠

phase ごとのディレクトリを分けることで、成果物の所有境界が明確になる。

Ideation の `traceability.md` と Inception の `traceability.md` と Construction の `traceability.md` は、接続対象が異なる。

同じファイルに混ぜると、phase ごとの gate と validator の責務が曖昧になる。

`state.json` を Intent のモジュールディレクトリ直下に残すことで、現在 phase と gate 状態を読む入口が一つになる。

これは AI-DLC v2 の Intent record 直下に状態ファイルを置く構造と対応する。

Intent のモジュールファイルを `.amadeus/intents/<intent-id>-<slug>.md` に残すことで、Amadeus DLC のモジュール構造を維持できる。

`operation/` を予約名に留めることで、将来の phase 追加余地を残しつつ、未確定の Operation 成果物を現在の契約として固定しない。

## 影響

後続作業では、validator、template、skill、examples の旧配置参照を新しい phase ディレクトリ配置へ切り替える。

validator では、旧 Intent 直下配置を互換性として受け入れない。

template では、Ideation、Inception、Construction の成果物を対応する phase ディレクトリ配下へ生成する。

skill では、読み書き対象のパスと相対リンクを新しい配置へ合わせる。

examples は、実際の skill 生成によって新しい配置へ再生成する。

`CONTEXT.md` は、この ADR の確定語彙だけを同期する。

GitHub Issue [#104](https://github.com/j5ik2o/amadeus/issues/104) は、この判断の起点として残す。

実装作業は #104 から分けた GitHub Issue [#105](https://github.com/j5ik2o/amadeus/issues/105)、[#106](https://github.com/j5ik2o/amadeus/issues/106)、[#107](https://github.com/j5ik2o/amadeus/issues/107) で扱う。

## 却下した案

Intent のモジュールディレクトリ直下に phase 成果物を置き続ける案は採用しない。

この案では、phase ごとの成果物境界と traceability の責務が曖昧になる。

`state.json` を phase ディレクトリ配下に置く案は採用しない。

この案では、現在 phase と gate 状態を読む入口が分散する。

`initialized/` を作る案は採用しない。

この案では、状態名と phase ディレクトリ名が混ざり、本家 AI-DLC v2 の `initialization/` ともずれる。

`operation/` を現時点の必須ディレクトリにする案は採用しない。

この案では、対応 skill が確定していない Operation 成果物を先に固定してしまう。

`traceability.md` と `decisions.md` を Intent のモジュールディレクトリ直下に共有ファイルとして残す案は採用しない。

この案では、phase ごとの判断と追跡の責務が混ざる。

## 未決定事項

`state.json.phase` の値として `initialized` を維持するか、`initialization` に変更するかは未決定である。

`initialization/registration.md` を必須成果物にするか、必要時だけ作る補助成果物にするかは未決定である。

artifact contract の継続的な文書を `docs/amadeus/` に再導入するか、ADR と `CONTEXT.md` に集約するかは未決定である。

validator、template、skill、examples の切り替え順序は未決定である。

## 参照

- [GitHub Issue #104: Intent layer の phase ディレクトリ分割方針を記録する](https://github.com/j5ik2o/amadeus/issues/104)
- [GitHub Issue #105: Validator を Intent Phase Directory Layout に対応させる](https://github.com/j5ik2o/amadeus/issues/105)
- [GitHub Issue #106: Template と skill の生成先を phase ディレクトリへ切り替える](https://github.com/j5ik2o/amadeus/issues/106)
- [GitHub Issue #107: Examples を Intent Phase Directory Layout で再生成する](https://github.com/j5ik2o/amadeus/issues/107)
- [GitHub Issue #103: Intent phase ディレクトリ成果物契約を ADR と docs に記録する](https://github.com/j5ik2o/amadeus/issues/103)
- [AI-DLC v2 Artifacts Reference](https://github.com/awslabs/aidlc-workflows/blob/v2/docs/guide/14-artifacts-reference.md)
- [AI-DLC v2 Phases and Stages](https://github.com/awslabs/aidlc-workflows/blob/v2/docs/guide/04-phases-and-stages.md)
- [AI-DLC v2 State Tracking and Audit Trail](https://github.com/awslabs/aidlc-workflows/blob/v2/docs/guide/10-state-and-audit.md)
