---
name: amadeus-construction-nfr-requirements
description: >-
  Amadeus Construction の内部 skill。Stage 3.2 NFR Requirements だけを Unit ごとに実行する。
  性能、セキュリティ、スケーラビリティ、信頼性の要求と技術スタックの判断が必要な Unit で、
  5 つの NFR 要求成果物を作成または補修する場面では必ず使う。NFR がなく技術スタックが
  確定済みの場合は実行しない。security-patch では要求の捕捉を兼ねる。設計、実装は作らない。
---

# amadeus-construction-nfr-requirements

## 目的

Construction の Stage 3.2 NFR Requirements だけを、対象 Unit ごとに進める。

この skill は `amadeus` 入口から Bolt 実行の中で呼び出される内部 skill である。

対象 Unit の非機能要求（性能、セキュリティ、スケーラビリティ、信頼性）と技術スタックの判断を確定する。
security-patch では Requirements Analysis を実行しないため、このステージが要求の捕捉を兼ね、`security-requirements.md` を要求の定義元にする。

## 前提

対象 record の `aidlc-state.md` で、Stage Progress の `nfr-requirements` が実行対象であり、CONSTRUCTION PHASE の `Per unit: <unit-id>` ブロックにある `nfr-requirements` の checkbox が `[ ]`、`[-]`、`[?]`、`[R]` のいずれかであることを前提にする。

checkbox が `[?]` の場合は、成果物を作り直さず、ゲートの提示から再開する。
checkbox が `[R]` の場合は、前回の成果物と差し戻し理由を提示してから、修正だけを行う。
どちらの場合も、手順を最初からやり直さない。

Condition は「性能要件、セキュリティ考慮、スケーラビリティ、技術スタック選定が必要な場合」である。
NFR 要求がなく技術スタックが確定済みの場合は、成果物を作らず対象 Unit の checkbox を `[S]` にして注記に skip 理由を書き、`STAGE_SKIPPED` イベントを `audit/audit.md` に追記して `amadeus` へ戻る。

少なくとも次を読む。

- `construction/<unit-id>-<slug>/functional-design/business-logic-model.md` と `business-rules.md`（Functional Design 実行時）
- `inception/requirements-analysis/requirements.md`（Requirements Analysis 実行時）
- `aidlc/spaces/<space>/codekb/<repo>/technology-stack.md`（brownfield の場合）
- `aidlc-state.md`

Functional Design を実行しなかった場合は、縮退時の入力代替に従い、`inception/requirements-analysis/requirements.md` と `aidlc/spaces/<space>/codekb/<repo>/` の成果物を材料にし、使った代替を `performance-requirements.md` に記録する。

## 質問

Construction では質問を例外扱いにする。
前段の成果物が扱わなかった本物の欠落を検出した場合だけ、`amadeus-grilling` のプロトコルで一問ずつ確認する。
質問を行った場合は `construction/<unit-id>-<slug>/nfr-requirements/nfr-requirements-questions.md` に記録する。

## テンプレート

優先順位は次である。

1. `aidlc/spaces/<space>/memory/templates/intents/construction/nfr-requirements/`
2. この skill に同梱された `templates/construction/nfr-requirements/`

分からない項目は空欄にせず、`未確認` と書く。

## 成果物

作成または更新するものは次だけである。

- `construction/<unit-id>-<slug>/nfr-requirements/performance-requirements.md`
- `construction/<unit-id>-<slug>/nfr-requirements/security-requirements.md`
- `construction/<unit-id>-<slug>/nfr-requirements/scalability-requirements.md`
- `construction/<unit-id>-<slug>/nfr-requirements/reliability-requirements.md`
- `construction/<unit-id>-<slug>/nfr-requirements/tech-stack-decisions.md`
- `construction/<unit-id>-<slug>/nfr-requirements/memory.md`
- `aidlc-state.md`（対象 Unit の checkbox）と `audit/audit.md`（ゲートイベントの追記）
- 質問を行った場合は `construction/<unit-id>-<slug>/nfr-requirements/nfr-requirements-questions.md`

## 手順

以下の手順は、checkbox が `[ ]` から開始する場合の流れである。
`[?]` または `[R]` からの再開では、前提の再開規則に従い、ゲートの再提示または修正に必要な手順だけを実行する。

1. checkbox が `[ ]` の場合だけ Condition を判定する。偽なら対象 Unit を `[S]` にして注記に skip 理由を書き、`audit/audit.md` に `STAGE_SKIPPED` を追記して終了する。`[-]`、`[?]`、`[R]` からの再開では再判定しない。
2. 対象 Unit の `nfr-requirements` の checkbox を `[-]` にする。
3. 入力を読み、本物の欠落だけを質問で確認する。Functional Design を実行しなかった場合は、前提の縮退時の入力代替に従い、使った代替を `performance-requirements.md` に記録する。
4. 成果物を作る。
5. `construction/<unit-id>-<slug>/nfr-requirements/memory.md` に、実行中の解釈、逸脱、トレードオフ、未解決の問いを記録する。
6. 対象 Unit の checkbox を `[?]` にし、`STAGE_AWAITING_APPROVAL` イベントを `audit/audit.md` に追記して、ゲートを提示する。

## ゲート

成果物の要約と確認先パスを示し、Approve と Request Changes の 2 択で承認を求める。
Construction のゲートは 2 択に限り、スキップ済みステージの追加実行を選択肢にしない。
Request Changes が 3 回続いたら Accept as-is を選択肢に加える。
ゲートを提示したターンでは人間の回答を待つ。

`aidlc-state.md` の `Construction Autonomy Mode` が `autonomous` で、対象 Bolt が walking skeleton ではない場合は、ゲートを提示せずに次へ進む。
この場合の approval evidence は、Bolt PR の merge 後に `amadeus` 入口の Bolt 境界処理が `STAGE_COMPLETED`（Details に PR の URL）として記録する。
失敗や本物の欠落を検出した場合は、autonomy に関わらず停止して人間に確認する。

承認されたら対象 Unit の checkbox を `[x]` にし、`GATE_APPROVED`（人間の回答をそのまま記録）と `STAGE_COMPLETED` を `audit/audit.md` に追記する。
差し戻されたら対象 Unit の checkbox を `[R]` にし、`GATE_REJECTED`（差し戻し理由をそのまま記録）と `STAGE_REVISING` を追記する。
Accept as-is が選ばれた場合は、対象 Unit の checkbox を `[x]` にし、`GATE_APPROVED`（Accept as-is である旨を含めて記録）と `STAGE_COMPLETED` を追記し、この判断を `construction/decisions.md` に記録する。

## 禁止事項

- NFR の設計（実現方式）を確定しない。設計は NFR Design の責務である。
- 実装とテストコードを作らない。
- 承認を待たずに `completed` を記録しない。

## 次の skill

- 続きを進める場合: `amadeus`（入口が Bolt 内の次ステージを解決する）
- 成果物の構造検証: `amadeus-validator`
