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

対象 record の `aidlc-state.md` で、Stage Progress の `ci-pipeline` が実行対象であり、checkbox が `[ ]`、`[-]`、`[?]`、`[R]` のいずれかであることを前提にする。

checkbox が `[?]` の場合は、成果物を作り直さず、ゲートの提示から再開する。
checkbox が `[R]` の場合は、前回の成果物と差し戻し理由を提示してから、修正だけを行う。
どちらの場合も、手順を最初からやり直さない。

Condition は「CI パイプラインの新設または大きな変更が必要な場合」である。
十分な CI が既にある場合は、成果物を作らず `ci-pipeline` の checkbox を `[S]` にして注記に skip 理由を書き、`STAGE_SKIPPED` イベントを `audit/audit.md` に追記して `amadeus` へ戻る。

全 Bolt が完了していることを確認する。
未完了の Bolt があれば停止し、`amadeus` へ戻る。

少なくとも次を読む。

- `construction/bolts/` 配下の `build-and-test-summary.md` と `build-test-results.md`
- `inception/practices-discovery/team-practices.md`（実行した場合）
- `aidlc-state.md`

## 質問

Construction では質問を例外扱いにする。
前段の成果物が扱わなかった本物の欠落を検出した場合だけ、`amadeus-grilling` のプロトコルで一問ずつ確認する。
質問を行った場合は `construction/ci-pipeline/ci-pipeline-questions.md` に記録する。

## テンプレート

優先順位は次である。

1. `aidlc/spaces/<space>/memory/templates/intents/construction/ci-pipeline/`
2. この skill に同梱された `templates/construction/ci-pipeline/`

分からない項目は空欄にせず、`未確認` と書く。

## 成果物

作成または更新するものは次だけである。

- `construction/ci-pipeline/ci-config.md`（CI 設定の設計）
- `construction/ci-pipeline/quality-gates.md`（品質ゲート）
- `construction/ci-pipeline/memory.md`
- `aidlc-state.md`（`ci-pipeline` の checkbox）と `audit/audit.md`（ゲートイベントの追記）
- 質問を行った場合は `construction/ci-pipeline/ci-pipeline-questions.md`

## 手順

以下の手順は、checkbox が `[ ]` から開始する場合の流れである。
`[?]` または `[R]` からの再開では、前提の再開規則に従い、ゲートの再提示または修正に必要な手順だけを実行する。

1. checkbox が `[ ]` の場合だけ Condition を判定する。十分な CI が既にある場合は `[S]` にし、`audit/audit.md` に `STAGE_SKIPPED` を追記して終了する。`[-]`、`[?]`、`[R]` からの再開では再判定しない。
2. `ci-pipeline` の checkbox を `[-]` にする。
3. Bolt のビルドとテストの記録、チームプラクティスを読み、本物の欠落だけを質問で確認する。
4. `ci-config.md` と `quality-gates.md` を作る。
5. `construction/ci-pipeline/memory.md` に、実行中の解釈、逸脱、トレードオフ、未解決の問いを記録する。
6. `ci-pipeline` の checkbox を `[?]` にし、`STAGE_AWAITING_APPROVAL` イベントを `audit/audit.md` に追記して、ゲートを提示する。

## ゲート

成果物の要約と確認先パスを示し、Approve と Request Changes の 2 択で承認を求める。
Construction のゲートは 2 択に限り、スキップ済みステージの追加実行を選択肢にしない。
Request Changes が 3 回続いたら Accept as-is を選択肢に加える。
ゲートを提示したターンでは人間の回答を待つ。

承認されたら `ci-pipeline` の checkbox を `[x]` にし、`GATE_APPROVED`（人間の回答をそのまま記録）と `STAGE_COMPLETED` を `audit/audit.md` に追記する。
差し戻されたら `ci-pipeline` の checkbox を `[R]` にし、`GATE_REJECTED`（差し戻し理由をそのまま記録）と `STAGE_REVISING` を追記する。
Accept as-is が選ばれた場合は、`ci-pipeline` の checkbox を `[x]` にし、`GATE_APPROVED`（Accept as-is である旨を含めて記録）と `STAGE_COMPLETED` を追記し、この判断を `construction/decisions.md` に記録する。

## 禁止事項

- 全 Bolt の完了前に実行しない。
- チームプラクティスと矛盾する CI トリガーを設計しない。矛盾がある場合は人間に確認する。
- 実装、テスト実行、Bolt 記録を作らない。
- 承認を待たずに checkbox を `[x]` にしない。

## 次の skill

- 続きを進める場合: `amadeus`（入口が Construction の phase 境界処理を解決する）
- 成果物の構造検証: `amadeus-validator`
