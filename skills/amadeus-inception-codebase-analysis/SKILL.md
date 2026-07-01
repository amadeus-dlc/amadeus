---
name: amadeus-inception-codebase-analysis
description: >-
  Amadeus Inception の内部 skill。既存コードに載せる Intent に対して、Codebase Analysis stage だけを実行し、
  codebase-analysis.md と state.json.inception.codebaseAnalysis を作成または補修する必要がある場面では必ず使う。
  requirements、user-stories、use-cases、units、bolts、traceability、decisions、Spec、実装は作らない。
---

# amadeus-inception-codebase-analysis

## 目的

Inception phase の Codebase Analysis だけを進める。

この skill は `amadeus-inception` の内部 skill である。
公開入口としての `amadeus-inception` から呼び出されることを主な用途にする。

既存コードに載せる Intent では、Requirement、Use Case、Unit、Unit Design Brief、Bolt を作る前に、既存能力、統合点、ギャップ、リスク、証拠、鮮度を整理する。

greenfield の Intent では `codebase-analysis.md` を作らず、`state.json.inception.codebaseAnalysis` に対象外理由を残す。

## 前提

対象 Intent が Ideation を完了していることを前提にする。

少なくとも次を読む。

- `.amadeus/intents.md`
- `.amadeus/intents/<intent-id>-<slug>.md`
- `.amadeus/intents/<intent-id>-<slug>/state.json`
- `.amadeus/intents/<intent-id>-<slug>/ideation/scope.md`
- `.amadeus/intents/<intent-id>-<slug>/ideation/ideation.md`
- `.amadeus/intents/<intent-id>-<slug>/ideation/traceability.md`
- `.amadeus/intents/<intent-id>-<slug>/ideation/decisions.md`
- steering layer
- 対象 workspace の既存コード、テスト、設定、実行結果

`state.json.phase` が `ideation` でなく、既存の Inception 成果物もない場合は停止する。
`state.json.ideation.gate` が `passed` でない場合は停止する。

## テンプレート

新規作成または構造補修では、`amadeus-inception/templates/intents/inception/codebase-analysis.md` のテンプレートを使う。

プロジェクト固有テンプレートが `.amadeus/settings/templates/intents/inception/codebase-analysis.md` にある場合は、そちらを優先する。

## 成果物

作成または更新するものは次だけである。

- `.amadeus/intents/<intent-id>-<slug>/inception/codebase-analysis.md`
- `.amadeus/intents/<intent-id>-<slug>/state.json`
- 記録対象の質問と回答が親 skill から渡された場合だけ、`.amadeus/intents/<intent-id>-<slug>/inception/grillings.md`
- 記録対象の質問と回答が親 skill から渡された場合だけ、`.amadeus/intents/<intent-id>-<slug>/inception/grillings/Gxxx-*.md`

既存成果物がある場合は、同じファイル名を尊重する。
不明な値は空欄にせず、`未確認` と書く。

## state.json

`state.json.inception.codebaseAnalysis` は次を持つ。

```ts
type InceptionCodebaseAnalysisState = {
  requirement: "required" | "not_required" | "unresolved";
  status: "not_started" | "in_progress" | "ready_for_approval" | "passed" | "failed" | "skipped" | "blocked" | "stale";
  evidence: TypedReference[];
  targetScope: string[];
  analyzedCommit?: string;
  analyzedAt?: string;
  skipReason?: "greenfield" | "no_existing_code" | "not_in_scope";
  blockedReason?: "target_scope_unresolved" | "required_input_missing" | "analysis_conflict";
  freshness?: "current" | "stale" | "unknown";
};
```

既存コードに載せる場合は、`requirement` を `required` にする。
greenfield、既存コードなし、対象外の場合は、`requirement` を `not_required`、`status` を `skipped` にし、`skipReason` を残す。
対象範囲が未確定の場合は、`requirement` を `unresolved` または `required`、`status` を `blocked` にし、`blockedReason` を残す。

## 手順

1. Ideation 成果物から、既存コードに載せる Intent かを判定する。
2. 既存コードに載せる場合は、対象コードと参照すべき既存能力を特定する。
3. 対象コード、既存能力、統合点、ギャップ、リスクを `codebase-analysis.md` に記録する。
4. 判断に使ったファイル、実行結果、コミット、確認日時を証拠と鮮度として記録する。
5. Unit Design Brief に渡す入力を `Inception への入力` に整理する。
6. `state.json.inception.codebaseAnalysis` を更新する。
7. 親 skill から記録対象の質問と回答が渡された場合だけ、`amadeus-grilling` の構造に従って Grilling Decision Trail を同じ変更で更新する。
8. 作成後に validator が使える場合は、対象 Intent を検証する。

## 禁止事項

- `requirements/**`、`user-stories/**`、`use-cases/**`、`units/**`、`bolts/**` を作らない。
- `traceability.md`、`decisions/**` を更新しない。
- Spec、実装、CI を作らない。
- 推測でドメインモデル、境界づけられたコンテキスト、契約を確定しない。
- Impact Mapping を独立 stage として作らない。

## 次の skill

- Requirements Definition へ進む場合: `amadeus-inception-requirements-definition`
- Inception 全体を進める場合: `amadeus-inception`
