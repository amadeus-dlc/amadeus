---
name: amadeus-construction-infrastructure-design
description: >-
  Amadeus Construction の内部 skill。Stage 3.4 Infrastructure Design だけを Unit ごとに実行する。
  インフラサービスの対応付け、デプロイアーキテクチャ、クラウドリソースが必要な Unit で、
  deployment-architecture.md ほかの設計成果物を作成または補修する場面では必ず使う。
  インフラ変更がなく定義済みの場合は実行しない。デプロイの実行と実装は作らない。
---

# amadeus-construction-infrastructure-design

## 目的

Construction の Stage 3.4 Infrastructure Design だけを、対象 Unit ごとに進める。

この skill は `amadeus` 入口から Bolt 実行の中で呼び出される内部 skill である。

NFR 設計とアプリケーション設計から、デプロイアーキテクチャ、インフラサービス、監視、CI/CD パイプラインの設計を作る。
Amadeus は Operation phase を対象外にするため、デプロイの実行はこのステージの設計成果物を根拠に人間が行う。

## 前提

対象 Intent の `state.json` で、`stages["infrastructure-design"]` が実行対象であり、対象 Unit の `stages["infrastructure-design"].units["<unit-id>"].state` が `pending`、`active`、`awaiting_approval`、`revising` のいずれかであることを前提にする。

状態が `awaiting_approval` の場合は、成果物を作り直さず、ゲートの提示から再開する。
状態が `revising` の場合は、前回の成果物と差し戻し理由を提示してから、修正だけを行う。
どちらの場合も、手順を最初からやり直さない。

Condition は「インフラサービスの対応付け、デプロイアーキテクチャ、クラウドリソースが必要な場合」である。
インフラ変更がなく、インフラが定義済みの場合は、成果物を作らず対象 Unit の状態を `skipped` にし、理由を記録して `amadeus` へ戻る。

少なくとも次を読む。

- `construction/<unit-id>-<slug>/nfr-design/` の 5 成果物（NFR Design 実行時）
- `inception/application-design/components.md` と `services.md`（Application Design 実行時）
- `construction/<unit-id>-<slug>/functional-design/business-logic-model.md`（Functional Design 実行時）
- `state.json`

供給ステージを実行しなかった入力は、縮退時の入力代替に従い、`inception/requirements-analysis/requirements.md`、対象リポジトリの既存デプロイ設定（CI 設定、IaC 定義）、`.amadeus/knowledge/codebase/<repo>/` の成果物を材料にし、使った代替を `deployment-architecture.md` に記録する。

## 質問

Construction では質問を例外扱いにする。
前段の成果物が扱わなかった本物の欠落を検出した場合だけ、`amadeus-grilling` のプロトコルで一問ずつ確認する。
質問を行った場合は `construction/<unit-id>-<slug>/infrastructure-design/questions.md` に記録する。

## テンプレート

優先順位は次である。

1. `.amadeus/settings/templates/intents/construction/infrastructure-design/`
2. この skill に同梱された `templates/construction/infrastructure-design/`

分からない項目は空欄にせず、`未確認` と書く。

## 成果物

作成または更新するものは次だけである。

- `construction/<unit-id>-<slug>/infrastructure-design/deployment-architecture.md`
- `construction/<unit-id>-<slug>/infrastructure-design/infrastructure-services.md`
- `construction/<unit-id>-<slug>/infrastructure-design/monitoring-design.md`
- `construction/<unit-id>-<slug>/infrastructure-design/cicd-pipeline.md`
- `construction/<unit-id>-<slug>/infrastructure-design/shared-infrastructure.md`（共有インフラがある場合のみ）
- `state.json`（対象 Unit の状態と approval evidence）
- 質問を行った場合は `construction/<unit-id>-<slug>/infrastructure-design/questions.md`

## 手順

以下の手順は、状態が `pending` から開始する場合の流れである。
`awaiting_approval` または `revising` からの再開では、前提の再開規則に従い、ゲートの再提示または修正に必要な手順だけを実行する。

1. 状態が `pending` の場合だけ Condition を判定する。偽なら対象 Unit を `skipped` にして終了する。`active`、`awaiting_approval`、`revising` からの再開では再判定しない。
2. 対象 Unit の `stages["infrastructure-design"].units["<unit-id>"].state` を `active` にする。
3. 入力を読み、本物の欠落だけを質問で確認する。供給ステージを実行しなかった入力は、前提の縮退時の入力代替に従い、使った代替を `deployment-architecture.md` に記録する。
4. 成果物を作る。
5. 対象 Unit の状態を `awaiting_approval` にし、ゲートを提示する。

## ゲート

成果物の要約と確認先パスを示し、Approve と Request Changes の 2 択で承認を求める。
Construction のゲートは 2 択に限り、スキップ済みステージの追加実行を選択肢にしない。
Request Changes が 3 回続いたら Accept as-is を選択肢に加える。
ゲートを提示したターンでは人間の回答を待つ。

`state.json.autonomy` が `continue_autonomously` で、対象 Bolt が walking skeleton ではない場合は、ゲートを提示せずに次へ進む。
この場合の approval evidence は、Bolt PR の merge 後に `amadeus` 入口の Bolt 境界処理が `via: "pr"` と PR の URL で記録する。
失敗や本物の欠落を検出した場合は、autonomy に関わらず停止して人間に確認する。

承認されたら `stages["infrastructure-design"].units["<unit-id>"].state` を `completed` にし、`stages["infrastructure-design"].units["<unit-id>"].approval` に `approvedAt` と `via: "conversation"` を記録する。
差し戻されたら `stages["infrastructure-design"].units["<unit-id>"].state` を `revising` にする。
Accept as-is が選ばれた場合は、`stages["infrastructure-design"].units["<unit-id>"].state` を `completed` にし、`stages["infrastructure-design"].units["<unit-id>"].approval` に `approvedAt`、`via: "conversation"`、`"acceptedAsIs": true` を記録し、この判断を `construction/decisions.md` に記録する。

## 禁止事項

- デプロイを実行しない。実行は人間に委ねる。
- 実装とテストコードを作らない。
- 承認を待たずに `completed` を記録しない。

## 次の skill

- 続きを進める場合: `amadeus`（入口が Bolt 内の次ステージを解決する）
- 成果物の構造検証: `amadeus-validator`
