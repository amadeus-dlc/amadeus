---
name: amadeus-ideation-scope-definition
description: >-
  Amadeus Ideation の内部 skill。Stage 1.4 Scope Definition だけを実行する。
  対象 Intent の対象と対象外の境界を定め、テーマ内の作業候補を優先度付きのスコープバックログとして整理し、
  scope-document.md と intent-backlog.md を作成または補修する場面では必ず使う。
  今回やらない作業を別 Intent として起こさない。要求、Unit、Bolt、実装は作らない。
---

# amadeus-ideation-scope-definition

## 目的

Ideation の Stage 1.4 Scope Definition だけを進める。

この skill は `amadeus` 入口から呼び出される内部 skill である。

対象と対象外の境界を定め、価値を出せる最小スコープを確認し、テーマ内の作業候補を優先度付きのスコープバックログとして整理する。
スコープバックログは「今回やらないもの」の受け皿であり、将来 Intent の予約席ではない。

## 前提

対象 Intent の `state.json` で、`stages["scope-definition"]` が実行対象であり、状態が `pending`、`active`、`awaiting_approval`、`revising` のいずれかであることを前提にする。

状態が `awaiting_approval` の場合は、成果物を作り直さず、ゲートの提示から再開する。
状態が `revising` の場合は、前回の成果物と差し戻し理由を提示してから、修正だけを行う。
どちらの場合も、手順を最初からやり直さない。

少なくとも次を読む。

- `.amadeus/intents/<intent-id>-<slug>.md`
- `state.json`
- `ideation/feasibility/`（実行した場合。特に `constraint-register.md`）
- steering layer

## 質問

次の論点を確認する。

- 価値を出せる最小のスコープはどこまでか。
- 作業候補のうち must-have と nice-to-have はどれか。
- 作業候補間に依存があるか。
- 順序の好みはどれか（リスク先行、価値先行、依存先行）。
- 特定の作業候補に紐づく期限があるか。

質問は `amadeus-grilling` のプロトコルに従い、一問ずつ、推奨回答を添えて提示し、回答を待つ。
質問の量は `state.json.depth` を目安にする。
質問と回答は `ideation/scope-definition/questions.md` に記録する。
スコープの確定判断は `ideation/grillings.md` と `ideation/grillings/Gxxx-<topic>.md` にも記録する。

## テンプレート

優先順位は次である。

1. `.amadeus/settings/templates/intents/ideation/scope-definition/`
2. この skill に同梱された `templates/ideation/scope-definition/`

分からない項目は空欄にせず、`未確認` と書く。

## 成果物

作成または更新するものは次だけである。

- `ideation/scope-definition/scope-document.md`
- `ideation/scope-definition/intent-backlog.md`
- `ideation/scope-definition/questions.md`
- `state.json`（`stages["scope-definition"]` の状態と approval evidence）

スコープバックログの項目は proto-Unit として書き、MoSCoW を基本に優先度を付ける。
必要に応じて WSJF または RICE を使う。

## 手順

1. `stages["scope-definition"].state` を `active` にする。
2. Intent のモジュールファイル、制約、steering layer を読み、テーマ内の作業候補を洗い出す。
3. 不足論点を質問で確認する。
4. `scope-document.md` に対象と対象外の境界を書く。
5. `intent-backlog.md` に、今回の対象に含めない作業候補と将来候補を優先度付きで書く。
6. `stages["scope-definition"].state` を `awaiting_approval` にし、ゲートを提示する。

## ゲート

成果物の要約と確認先パスを示し、Approve と Request Changes の 2 択で承認を求める。
Ideation ステージでは、スキップ済みステージの追加実行を第 3 の選択肢にできる。
スキップ済みステージの追加実行が選ばれた場合は、対象ステージの `stages` の状態を `skipped` から `pending` に戻し、skip 理由の記録を取り消してから `amadeus` 入口へ戻る。入口が次の解決で対象ステージを選ぶ。
Request Changes が 3 回続いたら Accept as-is を選択肢に加える。
ゲートを提示したターンでは人間の回答を待つ。

承認されたら `stages["scope-definition"].state` を `completed` にし、`stages["scope-definition"].approval` に `approvedAt` と `via: "conversation"` を記録する。
差し戻されたら `state` を `revising` にする。
Accept as-is が選ばれた場合は、`stages["scope-definition"].state` を `completed` にし、`stages["scope-definition"].approval` に `approvedAt`、`via: "conversation"`、`"acceptedAsIs": true` を記録し、この判断を `ideation/decisions.md` に記録する。

## 禁止事項

- バックログ項目を新しい Intent として起こさない。Intent 化の判断は `amadeus` 入口の Intake だけが行う。
- 対象外の作業を暗黙に捨てない。認識した作業候補は必ずバックログに記録する。
- 要求、Unit、Bolt、実装を作らない。
- 承認を待たずに `completed` を記録しない。

## 次の skill

- 続きを進める場合: `amadeus`（入口が次ステージを解決する）
- 成果物の構造検証: `amadeus-validator`
