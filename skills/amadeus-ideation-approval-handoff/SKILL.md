---
name: amadeus-ideation-approval-handoff
description: >-
  Amadeus Ideation の内部 skill。Stage 1.7 Approval & Handoff だけを実行する。
  Ideation の成果物を initiative-brief.md に集約し、phase の decisions.md と traceability.md を確定して、
  Inception への引き継ぎ承認と phase PR を進める場面では必ず使う。
  Inception 成果物、要求、Unit、Bolt、実装は作らない。
---

# amadeus-ideation-approval-handoff

## 目的

Ideation の Stage 1.7 Approval & Handoff だけを進める。

この skill は `amadeus` 入口から呼び出される内部 skill である。

Ideation の全成果物を initiative brief に集約し、phase の判断記録と追跡を確定し、Inception への引き継ぎ承認を得る。

## 前提

対象 Intent の `state.json` で、`stages["approval-handoff"]` が実行対象であり、状態が `pending`、`active`、`revising` のいずれかであることを前提にする。
Ideation の他の実行対象ステージがすべて `completed` または `skipped` であることを確認する。

少なくとも次を読む。

- `.amadeus/intents/<intent-id>-<slug>.md`
- `state.json`
- `ideation/` 配下の全ステージ成果物
- `ideation/grillings.md`（存在する場合）

## テンプレート

優先順位は次である。

1. `.amadeus/settings/templates/intents/ideation/approval-handoff/`
2. この skill に同梱された `templates/ideation/approval-handoff/`

分からない項目は空欄にせず、`未確認` と書く。

## 成果物

作成または更新するものは次だけである。

- `ideation/approval-handoff/initiative-brief.md`
- `ideation/decisions.md` と `ideation/decisions/D001-<slug>.md` 以降
- `ideation/traceability.md`
- `ideation/approval-handoff/questions.md`
- `state.json`（`stages["approval-handoff"]` の状態と approval evidence）

initiative brief は、Intent の目的、成功条件、スコープ境界、バックログ要約、制約、体制、モックの参照を 1 つにまとめ、Inception が最初に読む文書にする。
decisions には、Ideation で確定した判断を記録する。
traceability には、成功条件から Ideation 成果物への対応を記録する。

## 手順

1. Ideation の実行対象ステージがすべて `completed` または `skipped` であることを確認する。未完了があれば停止し、`amadeus` へ戻る。
2. `stages["approval-handoff"].state` を `active` にする。
3. 全ステージ成果物を読み、矛盾や未確認の残りを検出する。判断が必要な残りは一問ずつ確認し、`questions.md` に記録する。
4. `initiative-brief.md` を作る。
5. `decisions.md` と個別 decision、`traceability.md` を確定する。
6. `stages["approval-handoff"].state` を `awaiting_approval` にし、ゲートを提示する。
7. 承認後、Ideation 成果物の phase PR の作成を案内する。merge の確認後、`phaseGates.ideation` に approval evidence（`via: "pr"`、PR の URL）を記録し、`phase` を `inception` にする。

## ゲート

initiative brief の要約と確認先パスを示し、Approve と Request Changes の 2 択で承認を求める。
Request Changes が 3 回続いたら Accept as-is を選択肢に加える。
ゲートを提示したターンでは人間の回答を待つ。

承認されたら `completed` と approval evidence を記録し、差し戻されたら `revising` にする。

## 禁止事項

- Ideation の未完了ステージを飛ばしてまとめない。
- Inception 成果物（要求、ストーリー、設計、Unit、Bolt）を作らない。
- phase PR の merge を待たずに `phase` を進めない。
- 承認を待たずに `completed` を記録しない。

## 次の skill

- 続きを進める場合: `amadeus`（入口が Inception のステージを解決する）
- 成果物の構造検証: `amadeus-validator`
