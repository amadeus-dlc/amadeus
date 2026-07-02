---
name: amadeus-inception-units-generation
description: >-
  Amadeus Inception の内部 skill。Stage 2.7 Units Generation だけを実行する。
  Application Design と要求から Unit と依存 DAG を生成し、units.md、unit-dependencies.md、
  unit-story-map.md を作成または補修する場面では必ず使う。トポロジ（Unit の境界と依存）だけを作り、
  実装順序と経済的な順序付けは Delivery Planning に委ねる。Bolt、実装は作らない。
---

# amadeus-inception-units-generation

## 目的

Inception の Stage 2.7 Units Generation だけを進める。

この skill は `amadeus` 入口から呼び出される内部 skill である。

Application Design と要求から、Unit と依存 DAG を生成する。

このステージはトポロジ（Unit の境界と依存）だけを作る。
実装順序、critical path の推奨、経済的な順序付け（何を先に出荷するか）は扱わない。
それらは Stage 2.8 Delivery Planning の責務である。

## 前提

対象 Intent の `state.json` で、`stages["units-generation"]` が実行対象であり、状態が `pending`、`active`、`awaiting_approval`、`revising` のいずれかであることを前提にする。

状態が `awaiting_approval` の場合は、成果物を作り直さず、ゲートの提示から再開する。
状態が `revising` の場合は、前回の成果物と差し戻し理由を提示してから、修正だけを行う。
どちらの場合も、手順を最初からやり直さない。

少なくとも次を読む。

- `inception/requirements-analysis/requirements.md`
- `inception/application-design/`（実行した場合。components、component-methods、services、component-dependency、design-decisions）
- `inception/user-stories/stories.md`（実行した場合）
- `ideation/scope-definition/intent-backlog.md`（存在する場合。項目を Unit 候補として評価する）
- `state.json`

Application Design を実行しなかった場合は、縮退時の入力代替に従い、Reverse Engineering の `architecture.md` と `component-inventory.md`、または `requirements.md` から Unit 境界を判断する。

## 質問

次の論点を人間に確認する。

- Unit の境界戦略はどれか（サービス別、機能別、ドメイン別、デプロイ対象別）。
- 粒度はどちらに寄せるか（粗い、細かい）。

質問は `amadeus-grilling` のプロトコルに従い、一問ずつ、推奨回答を添えて提示し、回答を待つ。
質問を行った場合は `inception/units-generation/questions.md` に記録する。
境界戦略と粒度の確定判断は `inception/grillings.md` と `inception/grillings/Gxxx-<topic>.md` にも記録する。

## テンプレート

優先順位は次である。

1. `.amadeus/settings/templates/intents/inception/units-generation/`
2. この skill に同梱された `templates/inception/units-generation/`

分からない項目は空欄にせず、`未確認` と書く。

## 成果物

作成または更新するものは次だけである。

- `inception/units-generation/units.md`（Unit 一覧。識別子 `U001` 以降、責務、対応する要求）
- `inception/units-generation/unit-dependencies.md`（Unit の依存 DAG）
- `inception/units-generation/unit-story-map.md`（Unit とストーリーの対応。stories がある場合のみ）
- `state.json`（`stages["units-generation"]` の状態と approval evidence）
- 質問を行った場合は `inception/units-generation/questions.md`

Unit が多い場合は `units/<unit-id>-<slug>.md` へ分割してよい。
その場合も `units.md` を一覧として維持する。

## 手順

以下の手順は、状態が `pending` から開始する場合の流れである。
`awaiting_approval` または `revising` からの再開では、前提の再開規則に従い、ゲートの再提示または修正に必要な手順だけを実行する。

1. `stages["units-generation"].state` を `active` にする。
2. Application Design の成果物と要求を読み、Unit 候補を洗い出す。スコープバックログの項目も Unit 候補として評価する。
3. 境界戦略と粒度を人間に確認する。
4. `units.md` と `unit-dependencies.md` を作る。依存は非循環にする。stories がある場合は `unit-story-map.md` も作る。
5. `stages["units-generation"].state` を `awaiting_approval` にし、ゲートを提示する。

## ゲート

成果物の要約と確認先パスを示し、Approve と Request Changes の 2 択で承認を求める。
Inception ステージでは、スキップ済みステージの追加実行を第 3 の選択肢にできる。
スキップ済みステージの追加実行が選ばれた場合は、対象ステージの `stages` の状態を `skipped` から `pending` に戻し、skip 理由の記録を取り消してから `amadeus` 入口へ戻る。入口が次の解決で対象ステージを選ぶ。
Request Changes が 3 回続いたら Accept as-is を選択肢に加える。
ゲートを提示したターンでは人間の回答を待つ。

承認されたら `stages["units-generation"].state` を `completed` にし、`stages["units-generation"].approval` に `approvedAt` と `via: "conversation"` を記録する。
差し戻されたら `stages["units-generation"].state` を `revising` にする。
Accept as-is が選ばれた場合は、`stages["units-generation"].state` を `completed` にし、`stages["units-generation"].approval` に `approvedAt`、`via: "conversation"`、`"acceptedAsIs": true` を記録し、この判断を `inception/decisions.md` に記録する。

## 禁止事項

- 実装順序、critical path、経済的な順序付けを書かない。それらは Delivery Planning の責務である。
- Bolt と Unit Design Brief を作らない。
- 技術レイヤー（DB、API、フロント）だけを根拠に Unit を分割しない。
- 承認を待たずに `completed` を記録しない。

## 次の skill

- 続きを進める場合: `amadeus`（入口が次ステージを解決する）
- 成果物の構造検証: `amadeus-validator`
