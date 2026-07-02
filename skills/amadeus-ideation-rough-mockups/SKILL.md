---
name: amadeus-ideation-rough-mockups
description: >-
  Amadeus Ideation の内部 skill。Stage 1.6 Rough Mockups だけを実行する。
  対象 Intent に UI がある場合、または API や backend のシステム相互作用を確認したい場合に、
  wireframes.md と user-flow.md を作成または補修する場面では必ず使う。
  高忠実度 UI、詳細モック、要求、実装は作らない。
---

# amadeus-ideation-rough-mockups

## 目的

Ideation の Stage 1.6 Rough Mockups だけを進める。

この skill は `amadeus` 入口から呼び出される内部 skill である。

後続の要求とストーリーの具体例として確認できる粒度で、ワイヤーフレームとユーザーフローを作る。
UI がない Intent では、システム相互作用図を作る。

## 前提

対象 Intent の `state.json` で、`stages["rough-mockups"]` が実行対象であり、状態が `pending`、`active`、`revising` のいずれかであることを前提にする。

Condition は「UI が対象に含まれる場合。API や backend はシステム相互作用図で代替する」である。
UI もシステム相互作用もない場合は、成果物を作らず `stages["rough-mockups"]` を `skipped` にし、理由を記録して `amadeus` へ戻る。

少なくとも次を読む。

- `.amadeus/intents/<intent-id>-<slug>.md`
- `state.json`
- `ideation/scope-definition/scope-document.md` と `intent-backlog.md`

## 質問

次の論点を確認する。

- 利用者が最初に確認したい画面または相互作用はどれか。
- 主要なフローの開始点と終了点はどこか。

質問は `amadeus-grilling` のプロトコルに従い、一問ずつ、推奨回答を添えて提示し、回答を待つ。
質問の量は `state.json.depth` を目安にする。
質問と回答は `ideation/rough-mockups/questions.md` に記録する。

## テンプレート

優先順位は次である。

1. `.amadeus/settings/templates/intents/ideation/rough-mockups/`
2. この skill に同梱された `templates/ideation/rough-mockups/`

図は Markdown に内包できる PlantUML または Mermaid で書く。
分からない項目は空欄にせず、`未確認` と書く。

## 成果物

作成または更新するものは次だけである。

- `ideation/rough-mockups/wireframes.md`（UI がない場合はシステム相互作用図）
- `ideation/rough-mockups/user-flow.md`
- `ideation/rough-mockups/questions.md`
- `state.json`（`stages["rough-mockups"]` の状態と approval evidence）

## 手順

1. Condition を判定する。偽なら `skipped` を記録して終了する。
2. `stages["rough-mockups"].state` を `active` にする。
3. scope-document と intent-backlog を読み、確認対象のフローを特定する。
4. 不足論点を質問で確認する。
5. `wireframes.md` と `user-flow.md` を作る。
6. `stages["rough-mockups"].state` を `awaiting_approval` にし、ゲートを提示する。

## ゲート

成果物の要約と確認先パスを示し、Approve と Request Changes の 2 択で承認を求める。
Ideation ステージでは、スキップ済みステージの追加実行を第 3 の選択肢にできる。
Request Changes が 3 回続いたら Accept as-is を選択肢に加える。
ゲートを提示したターンでは人間の回答を待つ。

承認されたら `stages["rough-mockups"].state` を `completed` にし、`stages["rough-mockups"].approval` に `approvedAt` と `via: "conversation"` を記録する。
差し戻されたら `state` を `revising` にする。

## 禁止事項

- 高忠実度の UI やデザインシステム対応を作らない。詳細化は Inception の Refined Mockups が扱う。
- 要求、Unit、Bolt、実装を作らない。
- 承認を待たずに `completed` を記録しない。

## 次の skill

- 続きを進める場合: `amadeus`（入口が次ステージを解決する）
- 成果物の構造検証: `amadeus-validator`
