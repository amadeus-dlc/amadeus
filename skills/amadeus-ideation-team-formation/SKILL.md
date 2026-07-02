---
name: amadeus-ideation-team-formation
description: >-
  Amadeus Ideation の内部 skill。Stage 1.5 Team Formation だけを実行する。
  対象 Intent でチーム構成、キャパシティ、mob 計画が意味を持つ場合に、
  team-assessment.md、skill-matrix.md、mob-composition.md を作成または補修する場面では必ず使う。
  単独開発者や小規模チームでは実行しない。要求、Unit、Bolt、実装は作らない。
---

# amadeus-ideation-team-formation

## 目的

Ideation の Stage 1.5 Team Formation だけを進める。

この skill は `amadeus` 入口から呼び出される内部 skill である。

スコープとバックログに対して、チームの体制、スキル、mob 構成を評価する。

## 前提

対象 Intent の `state.json` で、`stages["team-formation"]` が実行対象であり、状態が `pending`、`active`、`awaiting_approval`、`revising` のいずれかであることを前提にする。

状態が `awaiting_approval` の場合は、成果物を作り直さず、ゲートの提示から再開する。
状態が `revising` の場合は、前回の成果物と差し戻し理由を提示してから、修正だけを行う。
どちらの場合も、手順を最初からやり直さない。

Condition は「チーム構成、キャパシティ、mob 計画が意味を持つ場合」である。
単独開発者や小規模チームの場合は、成果物を作らず `stages["team-formation"]` を `skipped` にし、理由を記録して `amadeus` へ戻る。

少なくとも次を読む。

- `.amadeus/intents/<intent-id>-<slug>.md`
- `state.json`
- `ideation/scope-definition/scope-document.md` と `intent-backlog.md`
- steering layer（アクターの定義）

## 質問

次の論点を確認する。

- このスコープに関わる人は誰か。
- 必要なスキルと現在の充足はどうか。
- mob または並行の作業単位をどう組むか。

質問は `amadeus-grilling` のプロトコルに従い、一問ずつ、推奨回答を添えて提示し、回答を待つ。
質問の量は `state.json.depth` を目安にする。
質問と回答は `ideation/team-formation/questions.md` に記録する。

## テンプレート

優先順位は次である。

1. `.amadeus/settings/templates/intents/ideation/team-formation/`
2. この skill に同梱された `templates/ideation/team-formation/`

分からない項目は空欄にせず、`未確認` と書く。

## 成果物

作成または更新するものは次だけである。

- `ideation/team-formation/team-assessment.md`
- `ideation/team-formation/skill-matrix.md`
- `ideation/team-formation/mob-composition.md`
- `ideation/team-formation/questions.md`
- `state.json`（`stages["team-formation"]` の状態と approval evidence）

## 手順

以下の手順は、状態が `pending` から開始する場合の流れである。
`awaiting_approval` または `revising` からの再開では、前提の再開規則に従い、ゲートの再提示または修正に必要な手順だけを実行する。

1. 状態が `pending` の場合だけ Condition を判定する。偽なら `skipped` を記録して終了する。`active`、`awaiting_approval`、`revising` からの再開では再判定しない。
2. `stages["team-formation"].state` を `active` にする。
3. scope-document、intent-backlog、steering layer を読み、不足論点を質問で確認する。
4. 3 つの成果物を作る。
5. `stages["team-formation"].state` を `awaiting_approval` にし、ゲートを提示する。

## ゲート

成果物の要約と確認先パスを示し、Approve と Request Changes の 2 択で承認を求める。
Ideation ステージでは、スキップ済みステージの追加実行を第 3 の選択肢にできる。
スキップ済みステージの追加実行が選ばれた場合は、対象ステージの `stages` の状態を `skipped` から `pending` に戻し、skip 理由の記録を取り消してから `amadeus` 入口へ戻る。入口が次の解決で対象ステージを選ぶ。
Request Changes が 3 回続いたら Accept as-is を選択肢に加える。
ゲートを提示したターンでは人間の回答を待つ。

承認されたら `stages["team-formation"].state` を `completed` にし、`stages["team-formation"].approval` に `approvedAt` と `via: "conversation"` を記録する。
差し戻されたら `stages["team-formation"].state` を `revising` にする。
Accept as-is が選ばれた場合は、`stages["team-formation"].state` を `completed` にし、`stages["team-formation"].approval` に `approvedAt`、`via: "conversation"`、`"acceptedAsIs": true` を記録し、この判断を `ideation/decisions.md` に記録する。

## 禁止事項

- 単独開発者や小規模チームに対して実行しない。
- Bolt への担当割り当てを確定しない。割り当ては Inception の Delivery Planning が扱う。
- 要求、Unit、Bolt、実装を作らない。
- 承認を待たずに `completed` を記録しない。

## 次の skill

- 続きを進める場合: `amadeus`（入口が次ステージを解決する）
- 成果物の構造検証: `amadeus-validator`
