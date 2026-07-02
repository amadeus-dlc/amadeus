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

対象 Intent の `state.json` で、`stages["approval-handoff"]` が実行対象であり、状態が `pending`、`active`、`awaiting_approval`、`revising` のいずれかであることを前提にする。

状態が `awaiting_approval` の場合は、成果物を作り直さず、ゲートの提示から再開する。
状態が `revising` の場合は、前回の成果物と差し戻し理由を提示してから、修正だけを行う。
どちらの場合も、手順を最初からやり直さない。

Ideation の他の実行対象ステージがすべて `completed` または `skipped` であることを確認する。
Ideation のステージは `intent-capture`、`market-research`、`feasibility`、`scope-definition`、`team-formation`、`rough-mockups`、`approval-handoff` であり、このうち `stages` に含まれるものだけを確認対象にする。
Inception 以降のステージ（`reverse-engineering` 以降）は `pending` のままで正常であり、確認対象にしない。

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

1. Ideation の実行対象ステージ（前提に列挙した slug のうち `stages` に含まれるもの）がすべて `completed` または `skipped` であることを確認する。未完了があれば停止し、`amadeus` へ戻る。Inception 以降のステージの状態は判定に使わない。
2. `stages["approval-handoff"].state` を `active` にする。
3. 全ステージ成果物を読み、矛盾や未確認の残りを検出する。判断が必要な残りは一問ずつ確認し、`questions.md` に記録する。
4. `initiative-brief.md` を作る。
5. `decisions.md` と個別 decision、`traceability.md` を確定する。
6. `stages["approval-handoff"].state` を `awaiting_approval` にし、ゲートを提示する。
7. 承認後は `amadeus` 入口へ戻る。phase PR の案内、`phaseGates.ideation` の記録、`phase` の遷移は `amadeus` 入口の責務であり、この skill では行わない。

## ゲート

initiative brief の要約と確認先パスを示し、Approve と Request Changes の 2 択で承認を求める。
Request Changes が 3 回続いたら Accept as-is を選択肢に加える。
ゲートを提示したターンでは人間の回答を待つ。

承認されたら `stages["approval-handoff"].state` を `completed` にし、`stages["approval-handoff"].approval` に `approvedAt` と `via: "conversation"` を記録する。
差し戻されたら `state` を `revising` にする。
Accept as-is が選ばれた場合は、`stages["approval-handoff"].state` を `completed` にし、`stages["approval-handoff"].approval` に `approvedAt`、`via: "conversation"`、`"acceptedAsIs": true` を記録し、この判断を `ideation/decisions.md` に記録する。

## 禁止事項

- Ideation の未完了ステージを飛ばしてまとめない。
- Inception 成果物（要求、ストーリー、設計、Unit、Bolt）を作らない。
- `phaseGates` の記録と `phase` の遷移をこの skill で行わない。phase 境界処理は `amadeus` 入口の責務である。
- 承認を待たずに `completed` を記録しない。

## 次の skill

- 続きを進める場合: `amadeus`（入口が Inception のステージを解決する）
- 成果物の構造検証: `amadeus-validator`
