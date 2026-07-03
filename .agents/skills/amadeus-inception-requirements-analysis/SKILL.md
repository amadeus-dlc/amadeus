---
name: amadeus-inception-requirements-analysis
description: >-
  Amadeus Inception の内部 skill。Stage 2.3 Requirements Analysis だけを実行する。
  対象 Intent を検証可能な要求へ落とし、識別子と受け入れ条件を持つ requirements.md を
  作成または補修する場面では必ず使う。独立した acceptance.md は作らない。
  ストーリー、設計、Unit、Bolt、実装は作らない。
---

# amadeus-inception-requirements-analysis

## 目的

Inception の Stage 2.3 Requirements Analysis だけを進める。

この skill は `amadeus` 入口から呼び出される内部 skill である。

Intent の成功条件を、識別子と受け入れ条件を持つ検証可能な要求へ落とす。
深さは `aidlc-state.md` の `Depth` に従う。

## 前提

対象 record の `aidlc-state.md` で、Stage Progress の `requirements-analysis` が実行対象であり、checkbox が `[ ]`、`[-]`、`[?]`、`[R]` のいずれかであることを前提にする。

checkbox が `[?]` の場合は、成果物を作り直さず、ゲートの提示から再開する。
checkbox が `[R]` の場合は、前回の成果物と差し戻し理由を提示してから、修正だけを行う。
どちらの場合も、手順を最初からやり直さない。

少なくとも次を読む。

- `aidlc/spaces/<space>/intents/<dirName>.md`
- `ideation/intent-capture/intent-statement.md`（intent-capture を実行した場合。目的、対象、成功条件、契機の定義元にする。実行しなかった場合は本ステージの `requirements.md` を定義元にする）
- `aidlc-state.md`
- `ideation/scope-definition/scope-document.md` と `intent-backlog.md`（実行した場合）
- `ideation/feasibility/constraint-register.md`（実行した場合）
- `aidlc/spaces/<space>/codekb/<repo>/`（brownfield の場合）
- `inception/practices-discovery/team-practices.md`（実行した場合）

## 質問

次の論点を確認する。

- 成功条件を検証可能にするために足りない情報は何か。
- 各要求の受け入れ条件はどう観測するか。
- 対象外との境界で曖昧な点はないか。

質問は `amadeus-grilling` のプロトコルに従い、一問ずつ、推奨回答を添えて提示し、回答を待つ。
質問の量は `aidlc-state.md` の `Depth` を目安にする。
質問と回答は `inception/requirements-analysis/requirements-analysis-questions.md` に記録する。
要求の意味や後続判断に影響する確定判断は、`inception/grillings.md` と `inception/grillings/Gxxx-<topic>.md` にも記録する。

## テンプレート

優先順位は次である。

1. `aidlc/spaces/<space>/memory/templates/intents/inception/requirements-analysis/`
2. この skill に同梱された `templates/inception/requirements-analysis/`

分からない項目は空欄にせず、`未確認` と書く。

## 成果物

作成または更新するものは次だけである。

- `inception/requirements-analysis/requirements.md`（要求一覧。各要求に識別子 `R001` 以降と受け入れ条件を含める）
- `inception/requirements-analysis/requirements-analysis-questions.md`
- `inception/requirements-analysis/memory.md`（stage 実行の学習記録）
- `aidlc-state.md`（対象ステージの checkbox）と `audit/audit.md`（ゲートイベントの追記）

受け入れ条件は各要求に内包する。
独立した `acceptance.md` は作らない。
要求が多い場合は `requirements/<requirement-id>-<slug>.md` へ分割してよい。
その場合も `requirements.md` を一覧として維持する。

## 手順

以下の手順は、checkbox が `[ ]` から開始する場合の流れである。
`[?]` または `[R]` からの再開では、前提の再開規則に従い、ゲートの再提示または修正に必要な手順だけを実行する。

1. `aidlc-state.md` の `requirements-analysis` の checkbox を `[-]` にする。
2. Intent のモジュールファイルと intent-statement.md、スコープ境界、制約、codebase 知識を読み、要求候補を洗い出す。
3. 不足論点を質問で確認する。
4. `requirements.md` を作る。各要求は成功条件から追跡できるようにする。
5. stage の `memory.md` に、実行中の解釈、逸脱、トレードオフ、未解決の問いを記録する。
6. `aidlc-state.md` の `requirements-analysis` の checkbox を `[?]` にし、`STAGE_AWAITING_APPROVAL` イベントを `audit/audit.md` に追記して、ゲートを提示する。

## ゲート

成果物の要約と確認先パスを示し、Approve と Request Changes の 2 択で承認を求める。
Inception ステージでは、スキップ済みステージの追加実行を第 3 の選択肢にできる。
スキップ済みステージの追加実行が選ばれた場合は、対象ステージの checkbox を `[S]` から `[ ]` に戻し、skip 注記を `EXECUTE` に戻してから `amadeus` 入口へ戻る。入口が次の解決で対象ステージを選ぶ。
Request Changes が 3 回続いたら Accept as-is を選択肢に加える。
ゲートを提示したターンでは人間の回答を待つ。

承認されたら checkbox を `[x]` にし、`GATE_APPROVED`（人間の回答をそのまま記録）と `STAGE_COMPLETED` を `audit/audit.md` に追記する。
差し戻されたら checkbox を `[R]` にし、`GATE_REJECTED`（差し戻し理由をそのまま記録）と `STAGE_REVISING` を追記する。
Accept as-is が選ばれた場合は、checkbox を `[x]` にし、`GATE_APPROVED`（Accept as-is である旨を含めて記録）と `STAGE_COMPLETED` を追記し、この判断を `inception/decisions.md` に記録する。

## 禁止事項

- 独立した `acceptance.md` を作らない。受け入れ条件は各要求に内包する。
- 実現手段（設計、実装方針）を要求に書かない。
- ストーリー、Unit、Bolt、実装を作らない。
- 承認を待たずに `completed` を記録しない。

## 次の skill

- 続きを進める場合: `amadeus`（入口が次ステージを解決する）
- 成果物の構造検証: `amadeus-validator`
