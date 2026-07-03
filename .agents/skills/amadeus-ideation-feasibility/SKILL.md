---
name: amadeus-ideation-feasibility
description: >-
  Amadeus Ideation の内部 skill。Stage 1.3 Feasibility だけを実行する。
  対象 Intent に統合制約、規制要件、大きな技術不確実性がある場合に、
  feasibility-assessment.md、constraint-register.md、raid-log.md を作成または補修する場面では必ず使う。
  技術リスクのない軽微な変更では実行しない。scope-document、要求、実装は作らない。
---

# amadeus-ideation-feasibility

## 目的

Ideation の Stage 1.3 Feasibility だけを進める。

この skill は `amadeus` 入口から呼び出される内部 skill である。

技術、運用、セキュリティ、依存の観点で実現可能性を評価し、交渉不能な制約とリスクを登録する。
制約の登録は、how を書かずに後続の分解へ判断材料を渡すための成果物である。

## 前提

対象 record の `aidlc-state.md` で、Stage Progress の `feasibility` が実行対象であり、checkbox が `[ ]`、`[-]`、`[?]`、`[R]` のいずれかであることを前提にする。

checkbox が `[?]` の場合は、成果物を作り直さず、ゲートの提示から再開する。
checkbox が `[R]` の場合は、前回の成果物と差し戻し理由を提示してから、修正だけを行う。
どちらの場合も、手順を最初からやり直さない。

Condition は「統合制約、規制要件、大きな技術不確実性がある場合」である。
Condition が偽の場合は、成果物を作らず checkbox を `[S]` にして注記に skip 理由を書き、`STAGE_SKIPPED` イベントを `audit/audit.md` に追記して `amadeus` へ戻る。

少なくとも次を読む。

- `aidlc/spaces/<space>/intents/<dirName>.md`
- `aidlc-state.md`
- `ideation/market-research/`（実行した場合）
- Space の `memory/` と `knowledge/`

## 質問

次の論点を確認する。

- 技術、運用、セキュリティ、依存のどこに不確実性があるか。
- 交渉不能な制約（既存アーキテクチャ、期限、コンプライアンス、やらないこと）は何か。
- リスク、前提、課題、外部依存のうち、後続判断に効くものは何か。

質問は `amadeus-grilling` のプロトコルに従い、一問ずつ、推奨回答を添えて提示し、回答を待つ。
質問の量は `aidlc-state.md` の `Depth` を目安にする。
質問と回答は `ideation/feasibility/feasibility-questions.md` に記録する。

## テンプレート

優先順位は次である。

1. `aidlc/spaces/<space>/memory/templates/intents/ideation/feasibility/`
2. この skill に同梱された `templates/ideation/feasibility/`

分からない項目は空欄にせず、`未確認` と書く。

## 成果物

作成または更新するものは次だけである。

- `ideation/feasibility/feasibility-assessment.md`
- `ideation/feasibility/constraint-register.md`
- `ideation/feasibility/raid-log.md`
- `ideation/feasibility/feasibility-questions.md`
- `ideation/feasibility/memory.md`（stage 実行の学習記録）
- `aidlc-state.md`（対象ステージの checkbox）と `audit/audit.md`（ゲートイベントの追記）

## 手順

以下の手順は、checkbox が `[ ]` から開始する場合の流れである。
`[?]` または `[R]` からの再開では、前提の再開規則に従い、ゲートの再提示または修正に必要な手順だけを実行する。

1. checkbox が `[ ]` の場合だけ Condition を判定する。偽なら `[S]` を記録して終了する。`[-]`、`[?]`、`[R]` からの再開では再判定しない。
2. `aidlc-state.md` の `feasibility` の checkbox を `[-]` にする。
3. Intent のモジュールファイル、market-research の成果物、Space の `memory/` と `knowledge/` を読み、不足論点を質問で確認する。
4. 3 つの成果物を作る。
5. stage の `memory.md` に、実行中の解釈、逸脱、トレードオフ、未解決の問いを記録する。
6. `aidlc-state.md` の `feasibility` の checkbox を `[?]` にし、`STAGE_AWAITING_APPROVAL` イベントを `audit/audit.md` に追記して、ゲートを提示する。

## ゲート

成果物の要約と確認先パスを示し、Approve と Request Changes の 2 択で承認を求める。
Ideation ステージでは、スキップ済みステージの追加実行を第 3 の選択肢にできる。
スキップ済みステージの追加実行が選ばれた場合は、対象ステージの checkbox を `[S]` から `[ ]` に戻し、skip 注記を `EXECUTE` に戻してから `amadeus` 入口へ戻る。入口が次の解決で対象ステージを選ぶ。
Request Changes が 3 回続いたら Accept as-is を選択肢に加える。
ゲートを提示したターンでは人間の回答を待つ。

承認されたら checkbox を `[x]` にし、`GATE_APPROVED`（人間の回答をそのまま記録）と `STAGE_COMPLETED` を `audit/audit.md` に追記する。
差し戻されたら checkbox を `[R]` にし、`GATE_REJECTED`（差し戻し理由をそのまま記録）と `STAGE_REVISING` を追記する。
Accept as-is が選ばれた場合は、checkbox を `[x]` にし、`GATE_APPROVED`（Accept as-is である旨を含めて記録）と `STAGE_COMPLETED` を追記し、この判断を `ideation/decisions.md` に記録する。

## 禁止事項

- 実現手段の設計（アーキテクチャ、実装方針）を確定しない。制約と評価の記録に留める。
- `scope-document.md`、`intent-backlog.md`、要求、実装を作らない。
- 承認を待たずに `completed` を記録しない。

## 次の skill

- 続きを進める場合: `amadeus`（入口が次ステージを解決する）
- 成果物の構造検証: `amadeus-validator`
