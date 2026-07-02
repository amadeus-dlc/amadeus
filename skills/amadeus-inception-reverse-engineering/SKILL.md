---
name: amadeus-inception-reverse-engineering
description: >-
  Amadeus Inception の内部 skill。Stage 2.1 Reverse Engineering だけを実行する。
  brownfield の対象 Intent で、既存コードベースの業務概要、アーキテクチャ、コード構造、API、
  コンポーネント一覧、技術スタック、依存、品質評価を `.amadeus/knowledge/codebase/<repo>/` に
  作成または更新する場面では必ず使う。greenfield では実行しない。要求、設計、Unit、Bolt、実装は作らない。
---

# amadeus-inception-reverse-engineering

## 目的

Inception の Stage 2.1 Reverse Engineering だけを進める。

この skill は `amadeus` 入口から呼び出される内部 skill である。

既存コードベースを解析し、後続ステージと他の Intent が再利用できるコードベース知識を steering layer 配下に記録する。

## 前提

対象 Intent の `state.json` で、`stages["reverse-engineering"]` が実行対象であり、状態が `pending`、`active`、`awaiting_approval`、`revising` のいずれかであることを前提にする。

状態が `awaiting_approval` の場合は、成果物を作り直さず、ゲートの提示から再開する。
状態が `revising` の場合は、前回の成果物と差し戻し理由を提示してから、修正だけを行う。
どちらの場合も、手順を最初からやり直さない。

Condition は「brownfield（変更対象の既存コードがある）の場合」である。
greenfield の場合は、成果物を作らず `stages["reverse-engineering"]` を `skipped` にし、理由を記録して `amadeus` へ戻る。

既存の `.amadeus/knowledge/codebase/<repo>/` がある場合も、鮮度維持のため内容を点検し、古くなった記述を更新する。

## テンプレート

優先順位は次である。

1. `.amadeus/settings/templates/knowledge/codebase/`
2. この skill に同梱された `templates/knowledge/codebase/`

分からない項目は空欄にせず、`未確認` と書く。

## 成果物

作成または更新するものは次だけである。

steering layer 配下の `.amadeus/knowledge/codebase/<repo>/` に置くもの:

- `business-overview.md`
- `architecture.md`
- `code-structure.md`
- `api-documentation.md`
- `component-inventory.md`
- `technology-stack.md`
- `dependencies.md`
- `code-quality-assessment.md`
- `timestamp.md`（解析時刻と対象コミット）

Intent 配下に置くもの:

- `state.json`（`stages["reverse-engineering"]` の状態と approval evidence）
- 質問を行った場合は `inception/reverse-engineering/questions.md`

## 手順

以下の手順は、状態が `pending` から開始する場合の流れである。
`awaiting_approval` または `revising` からの再開では、前提の再開規則に従い、ゲートの再提示または修正に必要な手順だけを実行する。

1. 状態が `pending` の場合だけ Condition を判定する。greenfield なら `skipped` を記録して終了する。`active`、`awaiting_approval`、`revising` からの再開では再判定しない。
2. `stages["reverse-engineering"].state` を `active` にする。
3. 対象リポジトリのコードを解析し、9 つの成果物を `.amadeus/knowledge/codebase/<repo>/` に作成または更新する。
4. `timestamp.md` に解析時刻と対象コミットを記録する。
5. `stages["reverse-engineering"].state` を `awaiting_approval` にし、ゲートを提示する。

解析は読み取りだけで行い、対象コードを変更しない。
規模が大きい場合は、解析を subagent に委譲してよい。

## ゲート

成果物の要約と確認先パスを示し、Approve と Request Changes の 2 択で承認を求める。
Inception ステージでは、スキップ済みステージの追加実行を第 3 の選択肢にできる。
スキップ済みステージの追加実行が選ばれた場合は、対象ステージの `stages` の状態を `skipped` から `pending` に戻し、skip 理由の記録を取り消してから `amadeus` 入口へ戻る。入口が次の解決で対象ステージを選ぶ。
Request Changes が 3 回続いたら Accept as-is を選択肢に加える。
ゲートを提示したターンでは人間の回答を待つ。

承認されたら `stages["reverse-engineering"].state` を `completed` にし、`stages["reverse-engineering"].approval` に `approvedAt` と `via: "conversation"` を記録する。
差し戻されたら `stages["reverse-engineering"].state` を `revising` にする。
Accept as-is が選ばれた場合は、`stages["reverse-engineering"].state` を `completed` にし、`stages["reverse-engineering"].approval` に `approvedAt`、`via: "conversation"`、`"acceptedAsIs": true` を記録し、この判断を `inception/decisions.md` に記録する。

## 禁止事項

- greenfield に対して実行しない。
- 対象コードを変更しない。
- 成果物を Intent 配下（`inception/` など）に置かない。questions.md だけは Intent 配下に置く。
- 要求、設計、Unit、Bolt、実装を作らない。
- 承認を待たずに `completed` を記録しない。

## 次の skill

- 続きを進める場合: `amadeus`（入口が次ステージを解決する）
- 成果物の構造検証: `amadeus-validator`
