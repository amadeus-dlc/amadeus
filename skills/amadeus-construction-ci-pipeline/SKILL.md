---
name: amadeus-construction-ci-pipeline
description: >-
  Amadeus Construction の内部 skill。Stage 3.7 CI Pipeline だけを Intent 単位で実行する。
  CI パイプラインの新設または大きな変更が必要な Intent で、ci-config.md と quality-gates.md を
  作成または補修する場面では必ず使う。十分な CI が既にある場合は実行しない。
  実装と Bolt 記録は作らない。
---

# amadeus-construction-ci-pipeline

## 目的

Construction の Stage 3.7 CI Pipeline だけを、Intent 単位で進める。

この skill は `amadeus` 入口から呼び出される内部 skill である。

ビルドとテストの結果から、CI 設定と品質ゲートを設計する。
CI のトリガー設計（push、PR、tag）は、Practices Discovery で確認したチームプラクティスに従う。

## 前提

対象 Intent の `state.json` で、`stages["ci-pipeline"]` が実行対象であり、状態が `pending`、`active`、`awaiting_approval`、`revising` のいずれかであることを前提にする。

状態が `awaiting_approval` の場合は、成果物を作り直さず、ゲートの提示から再開する。
状態が `revising` の場合は、前回の成果物と差し戻し理由を提示してから、修正だけを行う。
どちらの場合も、手順を最初からやり直さない。

Condition は「CI パイプラインの新設または大きな変更が必要な場合」である。
十分な CI が既にある場合は、成果物を作らず `stages["ci-pipeline"]` を `skipped` にし、理由を記録して `amadeus` へ戻る。

全 Bolt が完了していることを確認する。
未完了の Bolt があれば停止し、`amadeus` へ戻る。

少なくとも次を読む。

- `construction/bolts/` 配下の `summary.md` と `test-results.md`
- `inception/practices-discovery/team-practices.md`（実行した場合）
- `state.json`

## 質問

Construction では質問を例外扱いにする。
前段の成果物が扱わなかった本物の欠落を検出した場合だけ、`amadeus-grilling` のプロトコルで一問ずつ確認する。
質問を行った場合は `construction/ci-pipeline/questions.md` に記録する。

## テンプレート

優先順位は次である。

1. `.amadeus/settings/templates/intents/construction/ci-pipeline/`
2. この skill に同梱された `templates/construction/ci-pipeline/`

分からない項目は空欄にせず、`未確認` と書く。

## 成果物

作成または更新するものは次だけである。

- `construction/ci-pipeline/ci-config.md`（CI 設定の設計）
- `construction/ci-pipeline/quality-gates.md`（品質ゲート）
- `state.json`（`stages["ci-pipeline"]` の状態と approval evidence）
- 質問を行った場合は `construction/ci-pipeline/questions.md`

## 手順

以下の手順は、状態が `pending` から開始する場合の流れである。
`awaiting_approval` または `revising` からの再開では、前提の再開規則に従い、ゲートの再提示または修正に必要な手順だけを実行する。

1. 状態が `pending` の場合だけ Condition を判定する。十分な CI が既にある場合は `skipped` を記録して終了する。`active`、`awaiting_approval`、`revising` からの再開では再判定しない。
2. `stages["ci-pipeline"].state` を `active` にする。
3. Bolt のビルドとテストの記録、チームプラクティスを読み、本物の欠落だけを質問で確認する。
4. `ci-config.md` と `quality-gates.md` を作る。
5. `stages["ci-pipeline"].state` を `awaiting_approval` にし、ゲートを提示する。

## ゲート

成果物の要約と確認先パスを示し、Approve と Request Changes の 2 択で承認を求める。
Construction のゲートは 2 択に限り、スキップ済みステージの追加実行を選択肢にしない。
Request Changes が 3 回続いたら Accept as-is を選択肢に加える。
ゲートを提示したターンでは人間の回答を待つ。

承認されたら `stages["ci-pipeline"].state` を `completed` にし、`stages["ci-pipeline"].approval` に `approvedAt` と `via: "conversation"` を記録する。
差し戻されたら `stages["ci-pipeline"].state` を `revising` にする。
Accept as-is が選ばれた場合は、`stages["ci-pipeline"].state` を `completed` にし、`stages["ci-pipeline"].approval` に `approvedAt`、`via: "conversation"`、`"acceptedAsIs": true` を記録し、この判断を `construction/decisions.md` に記録する。

## 禁止事項

- 全 Bolt の完了前に実行しない。
- チームプラクティスと矛盾する CI トリガーを設計しない。矛盾がある場合は人間に確認する。
- 実装、テスト実行、Bolt 記録を作らない。
- 承認を待たずに `completed` を記録しない。

## 次の skill

- 続きを進める場合: `amadeus`（入口が Construction の phase 境界処理を解決する）
- 成果物の構造検証: `amadeus-validator`
