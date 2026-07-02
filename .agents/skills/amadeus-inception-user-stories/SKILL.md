---
name: amadeus-inception-user-stories
description: >-
  Amadeus Inception の内部 skill。Stage 2.4 User Stories だけを実行する。
  利用者向け機能、複数ペルソナ、複雑な業務ロジック、チーム横断の作業がある Intent で、
  stories.md、personas.md、assessment.md を作成または補修する場面では必ず使う。
  純粋なリファクタリング、単発のバグ修正、インフラのみの変更、開発者ツールでは実行しない。
  要求、設計、Unit、Bolt、実装は作らない。
---

# amadeus-inception-user-stories

## 目的

Inception の Stage 2.4 User Stories だけを進める。

この skill は `amadeus` 入口から呼び出される内部 skill である。

要求を人間アクターの価値表現へ落とし、ペルソナを整理する。

## 前提

対象 Intent の `state.json` で、`stages["user-stories"]` が実行対象であり、状態が `pending`、`active`、`awaiting_approval`、`revising` のいずれかであることを前提にする。

状態が `awaiting_approval` の場合は、成果物を作り直さず、ゲートの提示から再開する。
状態が `revising` の場合は、前回の成果物と差し戻し理由を提示してから、修正だけを行う。
どちらの場合も、手順を最初からやり直さない。

Condition は「利用者向け機能、複数ペルソナ、複雑な業務ロジック、チーム横断の作業がある場合」である。
純粋なリファクタリング、単発のバグ修正、インフラのみの変更、開発者ツールの場合は、成果物を作らず `stages["user-stories"]` を `skipped` にし、理由を記録して `amadeus` へ戻る。

少なくとも次を読む。

- `inception/requirements-analysis/requirements.md`
- `state.json`
- `.amadeus/knowledge/codebase/<repo>/business-overview.md` と `component-inventory.md`（brownfield の場合）
- `inception/practices-discovery/team-practices.md`（実行した場合）
- steering layer（アクターの定義）

## テンプレート

優先順位は次である。

1. `.amadeus/settings/templates/intents/inception/user-stories/`
2. この skill に同梱された `templates/inception/user-stories/`

分からない項目は空欄にせず、`未確認` と書く。

## 成果物

作成または更新するものは次だけである。

- `inception/user-stories/stories.md`（ストーリー一覧。識別子 `S001` 以降と要求への参照を含める）
- `inception/user-stories/personas.md`
- `inception/user-stories/assessment.md`（要求に対するストーリーの充足評価）
- `state.json`（`stages["user-stories"]` の状態と approval evidence）
- 質問を行った場合は `inception/user-stories/questions.md`

## 手順

以下の手順は、状態が `pending` から開始する場合の流れである。
`awaiting_approval` または `revising` からの再開では、前提の再開規則に従い、ゲートの再提示または修正に必要な手順だけを実行する。

1. 状態が `pending` の場合だけ Condition を判定する。偽なら `skipped` を記録して終了する。`active`、`awaiting_approval`、`revising` からの再開では再判定しない。
2. `stages["user-stories"].state` を `active` にする。
3. 要求とアクターの定義を読み、ペルソナとストーリーを洗い出す。判断が必要な論点は `amadeus-grilling` のプロトコルで一問ずつ確認する。
4. `stories.md`、`personas.md`、`assessment.md` を作る。
5. `stages["user-stories"].state` を `awaiting_approval` にし、ゲートを提示する。

## ゲート

成果物の要約と確認先パスを示し、Approve と Request Changes の 2 択で承認を求める。
Inception ステージでは、スキップ済みステージの追加実行を第 3 の選択肢にできる。
スキップ済みステージの追加実行が選ばれた場合は、対象ステージの `stages` の状態を `skipped` から `pending` に戻し、skip 理由の記録を取り消してから `amadeus` 入口へ戻る。入口が次の解決で対象ステージを選ぶ。
Request Changes が 3 回続いたら Accept as-is を選択肢に加える。
ゲートを提示したターンでは人間の回答を待つ。

承認されたら `stages["user-stories"].state` を `completed` にし、`stages["user-stories"].approval` に `approvedAt` と `via: "conversation"` を記録する。
差し戻されたら `stages["user-stories"].state` を `revising` にする。
Accept as-is が選ばれた場合は、`stages["user-stories"].state` を `completed` にし、`stages["user-stories"].approval` に `approvedAt`、`via: "conversation"`、`"acceptedAsIs": true` を記録し、この判断を `inception/decisions.md` に記録する。

## 禁止事項

- 純粋なリファクタリング、単発のバグ修正、インフラのみの変更に対して実行しない。
- ユースケース成果物（`use-cases.md`）を作らない。アクターとシステムの相互作用の詳細は Construction の Functional Design が扱う。
- 要求、設計、Unit、Bolt、実装を作らない。
- 承認を待たずに `completed` を記録しない。

## 次の skill

- 続きを進める場合: `amadeus`（入口が次ステージを解決する）
- 成果物の構造検証: `amadeus-validator`
