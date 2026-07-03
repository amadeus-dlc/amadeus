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

対象 record の `aidlc-state.md` で、Stage Progress の `approval-handoff` が実行対象であり、checkbox が `[ ]`、`[-]`、`[?]`、`[R]` のいずれかであることを前提にする。

checkbox が `[?]` の場合は、成果物を作り直さず、ゲートの提示から再開する。
checkbox が `[R]` の場合は、前回の成果物と差し戻し理由を提示してから、修正だけを行う。
どちらの場合も、手順を最初からやり直さない。

Ideation の他の実行対象ステージがすべて checkbox `[x]` または `[S]` であることを確認する。
Ideation のステージは `intent-capture`、`market-research`、`feasibility`、`scope-definition`、`team-formation`、`rough-mockups`、`approval-handoff` であり、`aidlc-state.md` の Stage Progress にある IDEATION PHASE のこれらの checkbox を確認対象にする。
Inception 以降のステージ（`reverse-engineering` 以降）は `[ ]` のままで正常であり、確認対象にしない。

少なくとも次を読む。

- `aidlc/spaces/<space>/intents/<dirName>.md`
- `aidlc-state.md`
- `ideation/` 配下の全ステージ成果物
- `ideation/grillings.md`（存在する場合）

## テンプレート

優先順位は次である。

1. `aidlc/spaces/<space>/memory/templates/intents/ideation/approval-handoff/`
2. この skill に同梱された `templates/ideation/approval-handoff/`

分からない項目は空欄にせず、`未確認` と書く。
実行しなかったステージに対応する項（モック、体制など）は、存在しないファイルへのリンクを書かずに `該当なし` と書く。

## 成果物

作成または更新するものは次だけである。

- `ideation/approval-handoff/initiative-brief.md`
- `ideation/decisions.md` と `ideation/decisions/D001-<slug>.md` 以降
- `ideation/traceability.md`
- `ideation/approval-handoff/approval-handoff-questions.md`
- `ideation/approval-handoff/memory.md`
- `aidlc-state.md`（`approval-handoff` の checkbox）と `audit/audit.md`（ゲートイベントの追記）

initiative brief は、Intent の目的、成功条件、スコープ境界、バックログ要約、制約、体制、モックの参照を 1 つにまとめ、Inception が最初に読む文書にする。
decisions には、Ideation で確定した判断を記録する。
traceability には、成功条件から Ideation 成果物への対応を記録する。

## 手順

以下の手順は、checkbox が `[ ]` から開始する場合の流れである。
`[?]` または `[R]` からの再開では、前提の再開規則に従い、ゲートの再提示または修正に必要な手順だけを実行する。

1. Ideation の実行対象ステージ（前提に列挙した slug）がすべて checkbox `[x]` または `[S]` であることを確認する。未完了があれば停止し、`amadeus` へ戻る。Inception 以降のステージの状態は判定に使わない。
2. `aidlc-state.md` の `approval-handoff` の checkbox を `[-]` にする。
3. 全ステージ成果物を読み、矛盾や未確認の残りを検出する。判断が必要な残りは一問ずつ確認し、`approval-handoff-questions.md` に記録する。
4. `initiative-brief.md` を作る。
5. `decisions.md` と個別 decision、`traceability.md` を確定する。
6. stage の `memory.md` に、実行中の解釈、逸脱、トレードオフ、未解決の問いを記録する。
7. `aidlc-state.md` の `approval-handoff` の checkbox を `[?]` にし、`STAGE_AWAITING_APPROVAL` イベントを `audit/audit.md` に追記して、ゲートを提示する。
8. 承認後は `amadeus` 入口へ戻る。phase PR の案内、Ideation の `PHASE_VERIFIED` イベントの記録、Phase Progress の遷移は `amadeus` 入口の責務であり、この skill では行わない。

## ゲート

initiative brief の要約と確認先パスを示し、Approve と Request Changes の 2 択で承認を求める。
Request Changes が 3 回続いたら Accept as-is を選択肢に加える。
ゲートを提示したターンでは人間の回答を待つ。

承認されたら checkbox を `[x]` にし、`GATE_APPROVED`（人間の回答をそのまま記録）と `STAGE_COMPLETED` を `audit/audit.md` に追記する。
差し戻されたら checkbox を `[R]` にし、`GATE_REJECTED`（差し戻し理由をそのまま記録）と `STAGE_REVISING` を追記する。
Accept as-is が選ばれた場合は、checkbox を `[x]` にし、`GATE_APPROVED`（Accept as-is である旨を含めて記録）と `STAGE_COMPLETED` を追記し、この判断を `ideation/decisions.md` に記録する。

## 禁止事項

- Ideation の未完了ステージを飛ばしてまとめない。
- Inception 成果物（要求、ストーリー、設計、Unit、Bolt）を作らない。
- `PHASE_VERIFIED` イベントの記録と Phase Progress の遷移をこの skill で行わない。phase 境界処理は `amadeus` 入口の責務である。
- 承認を待たずに `completed` を記録しない。

## 次の skill

- 続きを進める場合: `amadeus`（入口が Inception のステージを解決する）
- 成果物の構造検証: `amadeus-validator`
