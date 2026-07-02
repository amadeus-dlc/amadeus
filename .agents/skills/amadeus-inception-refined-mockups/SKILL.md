---
name: amadeus-inception-refined-mockups
description: >-
  Amadeus Inception の内部 skill。Stage 2.5 Refined Mockups だけを実行する。
  UI があり Ideation で rough mockups を作った Intent で、mockups.md、interaction-spec.md、
  design-system-mapping.md、accessibility-checklist.md を作成または補修する場面では必ず使う。
  API は相互作用図を精緻化する。要求、設計、Unit、Bolt、実装は作らない。
---

# amadeus-inception-refined-mockups

## 目的

Inception の Stage 2.5 Refined Mockups だけを進める。

この skill は `amadeus` 入口から呼び出される内部 skill である。

rough mockups を、要求とストーリーに対応づけた詳細モックへ精緻化する。

## 前提

対象 Intent の `state.json` で、`stages["refined-mockups"]` が実行対象であり、状態が `pending`、`active`、`awaiting_approval`、`revising` のいずれかであることを前提にする。

状態が `awaiting_approval` の場合は、成果物を作り直さず、ゲートの提示から再開する。
状態が `revising` の場合は、前回の成果物と差し戻し理由を提示してから、修正だけを行う。
どちらの場合も、手順を最初からやり直さない。

Condition は「UI があり、Ideation で rough mockups を作った場合。API は相互作用図を精緻化する」である。
rough mockups が存在しない場合は、成果物を作らず `stages["refined-mockups"]` を `skipped` にし、理由を記録して `amadeus` へ戻る。

少なくとも次を読む。

- `ideation/rough-mockups/wireframes.md` と `user-flow.md`
- `inception/requirements-analysis/requirements.md`
- `inception/user-stories/stories.md`（実行した場合）
- `inception/practices-discovery/team-practices.md`（実行した場合）
- `state.json`

## 質問

次の論点を確認する。

- 詳細化で確定すべき相互作用はどれか。
- 使うデザインシステムや UI 規約はあるか。
- アクセシビリティで満たすべき基準は何か。

質問は `amadeus-grilling` のプロトコルに従い、一問ずつ、推奨回答を添えて提示し、回答を待つ。
質問の量は `state.json.depth` を目安にする。
質問と回答は `inception/refined-mockups/questions.md` に記録する。

## テンプレート

優先順位は次である。

1. `.amadeus/settings/templates/intents/inception/refined-mockups/`
2. この skill に同梱された `templates/inception/refined-mockups/`

図は Markdown に内包できる PlantUML または Mermaid で書く。
分からない項目は空欄にせず、`未確認` と書く。

## 成果物

作成または更新するものは次だけである。

- `inception/refined-mockups/mockups.md`
- `inception/refined-mockups/interaction-spec.md`
- `inception/refined-mockups/design-system-mapping.md`
- `inception/refined-mockups/accessibility-checklist.md`
- `inception/refined-mockups/questions.md`
- `state.json`（`stages["refined-mockups"]` の状態と approval evidence）

## 手順

以下の手順は、状態が `pending` から開始する場合の流れである。
`awaiting_approval` または `revising` からの再開では、前提の再開規則に従い、ゲートの再提示または修正に必要な手順だけを実行する。

1. 状態が `pending` の場合だけ Condition を判定する。偽なら `skipped` を記録して終了する。`active`、`awaiting_approval`、`revising` からの再開では再判定しない。
2. `stages["refined-mockups"].state` を `active` にする。
3. rough mockups、要求、ストーリーを読み、不足論点を質問で確認する。
4. 4 つの成果物を作る。各モックは対応する要求とストーリーの識別子を参照する。
5. `stages["refined-mockups"].state` を `awaiting_approval` にし、ゲートを提示する。

## ゲート

成果物の要約と確認先パスを示し、Approve と Request Changes の 2 択で承認を求める。
Inception ステージでは、スキップ済みステージの追加実行を第 3 の選択肢にできる。
スキップ済みステージの追加実行が選ばれた場合は、対象ステージの `stages` の状態を `skipped` から `pending` に戻し、skip 理由の記録を取り消してから `amadeus` 入口へ戻る。入口が次の解決で対象ステージを選ぶ。
Request Changes が 3 回続いたら Accept as-is を選択肢に加える。
ゲートを提示したターンでは人間の回答を待つ。

承認されたら `stages["refined-mockups"].state` を `completed` にし、`stages["refined-mockups"].approval` に `approvedAt` と `via: "conversation"` を記録する。
差し戻されたら `stages["refined-mockups"].state` を `revising` にする。
Accept as-is が選ばれた場合は、`stages["refined-mockups"].state` を `completed` にし、`stages["refined-mockups"].approval` に `approvedAt`、`via: "conversation"`、`"acceptedAsIs": true` を記録し、この判断を `inception/decisions.md` に記録する。

## 禁止事項

- rough mockups なしで実行しない。
- 実装（HTML、CSS、コンポーネントコード）を作らない。
- 要求、Unit、Bolt を作らない。
- 承認を待たずに `completed` を記録しない。

## 次の skill

- 続きを進める場合: `amadeus`（入口が次ステージを解決する）
- 成果物の構造検証: `amadeus-validator`
