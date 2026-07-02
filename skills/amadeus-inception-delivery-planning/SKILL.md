---
name: amadeus-inception-delivery-planning
description: >-
  Amadeus Inception の内部 skill。Stage 2.8 Delivery Planning だけを実行する。
  Units Generation 済みの Intent で、Unit の依存 DAG に経済的な順序付けを行い、
  bolt-plan.md、risk-and-sequencing-rationale.md、external-dependency-map.md を
  作成または補修する場面では必ず使う。Inception の最終ステージであり、実装は作らない。
---

# amadeus-inception-delivery-planning

## 目的

Inception の Stage 2.8 Delivery Planning だけを進める。

この skill は `amadeus` 入口から呼び出される内部 skill である。

Unit の依存 DAG に対して経済的な順序付け（何を先に出荷するか）を行い、Bolt 計画を作る。

## 前提

対象 Intent の `state.json` で、`stages["delivery-planning"]` が実行対象であり、状態が `pending`、`active`、`awaiting_approval`、`revising` のいずれかであることを前提にする。

状態が `awaiting_approval` の場合は、成果物を作り直さず、ゲートの提示から再開する。
状態が `revising` の場合は、前回の成果物と差し戻し理由を提示してから、修正だけを行う。
どちらの場合も、手順を最初からやり直さない。

`stages["units-generation"]` が `completed` であることを確認する。
未完了の場合は停止し、`amadeus` へ戻る。

少なくとも次を読む。

- `inception/units-generation/units.md` と `unit-dependencies.md`
- `inception/units-generation/unit-story-map.md`（存在する場合）
- `inception/requirements-analysis/requirements.md`
- `inception/application-design/components.md`（実行した場合）
- `inception/user-stories/stories.md` と `inception/refined-mockups/mockups.md`（実行した場合）
- `inception/practices-discovery/team-practices.md`（実行した場合）
- `ideation/team-formation/team-assessment.md`（実行した場合）
- `state.json`

## 質問

次の論点を人間に確認する。

- Bolt の束ね方はどれか（Unit 1 個ずつ、関連 Unit の束、Unit をまたぐ薄いスライス）。
- 最初の Bolt（walking skeleton）で貫通させる最小スライスはどこか。
- 順序付けの優先はどれか（リスク先行、価値先行、依存先行）。

質問は `amadeus-grilling` のプロトコルに従い、一問ずつ、推奨回答を添えて提示し、回答を待つ。
質問と回答は `inception/delivery-planning/questions.md` に記録する。
束ね方と順序の確定判断は `inception/grillings.md` と `inception/grillings/Gxxx-<topic>.md` にも記録する。

## テンプレート

優先順位は次である。

1. `.amadeus/settings/templates/intents/inception/delivery-planning/`
2. この skill に同梱された `templates/inception/delivery-planning/`

分からない項目は空欄にせず、`未確認` と書く。
実行しなかったステージに対応する項（体制など）は、存在しないファイルへのリンクを書かずに `該当なし` と書く。

## 成果物

作成または更新するものは次だけである。

- `inception/delivery-planning/bolt-plan.md`（Bolt 一覧。識別子 `B001` 以降、束ねる Unit、実行順序、Definition of Done、confidence hypothesis）
- `inception/delivery-planning/team-allocation.md`（Bolt への担当割り当て。チームがある場合のみ）
- `inception/delivery-planning/risk-and-sequencing-rationale.md`（順序付けの根拠とリスク）
- `inception/delivery-planning/external-dependency-map.md`（外部依存の対応）
- `inception/delivery-planning/questions.md`
- `state.json`（`stages["delivery-planning"]` の状態と approval evidence）

最初の Bolt は、アーキテクチャを貫通する最小スライス（walking skeleton）にする。
各 Bolt には Definition of Done と、その Bolt の出荷が何を証明するか（confidence hypothesis）を付ける。
Bolt が多い場合は `bolts/<bolt-id>-<slug>.md` へ分割してよい。

## 手順

以下の手順は、状態が `pending` から開始する場合の流れである。
`awaiting_approval` または `revising` からの再開では、前提の再開規則に従い、ゲートの再提示または修正に必要な手順だけを実行する。

1. `stages["units-generation"]` が `completed` であることを確認する。未完了なら停止し、`amadeus` へ戻る。
2. `stages["delivery-planning"].state` を `active` にする。
3. Unit の依存 DAG と要求を読み、束ね方、walking skeleton、順序の優先を人間に確認する。
4. `bolt-plan.md` を作る。順序は依存 DAG と矛盾しないようにする。
5. `risk-and-sequencing-rationale.md` と `external-dependency-map.md` を作る。チームがある場合は `team-allocation.md` も作る。
6. `stages["delivery-planning"].state` を `awaiting_approval` にし、ゲートを提示する。
7. 承認後は `amadeus` 入口へ戻る。Inception の phase PR の案内、`phaseGates.inception` の記録、`phase` の遷移は `amadeus` 入口の責務であり、この skill では行わない。

## ゲート

bolt-plan の要約と確認先パスを示し、Approve と Request Changes の 2 択で承認を求める。
Inception ステージでは、スキップ済みステージの追加実行を第 3 の選択肢にできる。
スキップ済みステージの追加実行が選ばれた場合は、対象ステージの `stages` の状態を `skipped` から `pending` に戻し、skip 理由の記録を取り消してから `amadeus` 入口へ戻る。入口が次の解決で対象ステージを選ぶ。
Request Changes が 3 回続いたら Accept as-is を選択肢に加える。
ゲートを提示したターンでは人間の回答を待つ。

承認されたら `stages["delivery-planning"].state` を `completed` にし、`stages["delivery-planning"].approval` に `approvedAt` と `via: "conversation"` を記録する。
差し戻されたら `stages["delivery-planning"].state` を `revising` にする。
Accept as-is が選ばれた場合は、`stages["delivery-planning"].state` を `completed` にし、`stages["delivery-planning"].approval` に `approvedAt`、`via: "conversation"`、`"acceptedAsIs": true` を記録し、この判断を `inception/decisions.md` に記録する。

## 禁止事項

- Units Generation の完了前に実行しない。
- 依存 DAG と矛盾する順序を作らない。
- Task 分解と実装を作らない。
- `phaseGates` の記録と `phase` の遷移をこの skill で行わない。phase 境界処理は `amadeus` 入口の責務である。
- 承認を待たずに `completed` を記録しない。

## 次の skill

- 続きを進める場合: `amadeus`（入口が Inception の phase 境界処理と Construction のステージを解決する）
- 成果物の構造検証: `amadeus-validator`
