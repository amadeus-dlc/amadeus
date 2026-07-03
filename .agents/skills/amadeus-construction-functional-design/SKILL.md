---
name: amadeus-construction-functional-design
description: >-
  Amadeus Construction の内部 skill。Stage 3.1 Functional Design だけを Unit ごとに実行する。
  新しいデータモデル、複雑な業務ロジック、業務ルールの設計が必要な Unit で、
  business-logic-model.md、business-rules.md、domain-entities.md、必要な場合の frontend-components.md を
  作成または補修する場面では必ず使う。新しい業務ロジックのない単純な変更では実行しない。
  実装、テスト、Bolt 記録は作らない。
---

# amadeus-construction-functional-design

## 目的

Construction の Stage 3.1 Functional Design だけを、対象 Unit ごとに進める。

この skill は `amadeus` 入口から Bolt 実行の中で呼び出される内部 skill である。

対象 Unit の業務ロジックモデル、業務ルール、ドメインエンティティを設計する。
UI がある Unit ではフロントエンドコンポーネントの構成も設計する。

Functional Design は詳細な Domain Model と Intent Contracts の管理元である。

## 前提

対象 record の `aidlc-state.md` で、Stage Progress の `functional-design` が実行対象であり、CONSTRUCTION PHASE の `Per unit: <unit-id>` ブロックにある `functional-design` の checkbox が `[ ]`、`[-]`、`[?]`、`[R]` のいずれかであることを前提にする。

checkbox が `[?]` の場合は、成果物を作り直さず、ゲートの提示から再開する。
checkbox が `[R]` の場合は、前回の成果物と差し戻し理由を提示してから、修正だけを行う。
どちらの場合も、手順を最初からやり直さない。

Condition は「新しいデータモデル、複雑な業務ロジック、業務ルールの設計が必要な場合」である。
新しい業務ロジックのない単純な変更では、成果物を作らず対象 Unit の checkbox を `[S]` にして注記に skip 理由を書き、`STAGE_SKIPPED` イベントを `audit/audit.md` に追記して `amadeus` へ戻る。

少なくとも次を読む。

- `inception/units-generation/unit-of-work.md`（対象 Unit。Units Generation を実行しなかった場合は暗黙 Unit として Intent のモジュールファイルと要求を使う）
- `inception/requirements-analysis/requirements.md`（実行した場合）
- `inception/application-design/`（実行した場合）
- `aidlc/spaces/<space>/knowledge/domain-map.md`、`aidlc/spaces/<space>/knowledge/context-map.md`、Event Storming の成果物（存在する場合。Aggregate Candidate と Bounded Context Candidate を判断材料にする）
- `aidlc-state.md`

Application Design を実行しなかった場合は、縮退時の入力代替に従い、`inception/requirements-analysis/requirements.md` と `aidlc/spaces/<space>/codekb/<repo>/` の成果物を設計の材料にし、使った代替を `business-logic-model.md` に記録する。

## 質問

Construction では質問を例外扱いにする。
前段の成果物が扱わなかった本物の欠落（Unit 固有のエッジケースなど）を検出した場合だけ、`amadeus-grilling` のプロトコルで一問ずつ確認する。
質問を行った場合は `construction/<unit-id>-<slug>/functional-design/functional-design-questions.md` に記録する。

## テンプレート

優先順位は次である。

1. `aidlc/spaces/<space>/memory/templates/intents/construction/functional-design/`
2. この skill に同梱された `templates/construction/functional-design/`

template に Catalog 外の補助見出しがある場合は、その見出しも保持する。
分からない項目は空欄にせず、`未確認` と書く。

## 成果物

作成または更新するものは次だけである。

- `construction/<unit-id>-<slug>/functional-design/business-logic-model.md`
- `construction/<unit-id>-<slug>/functional-design/business-rules.md`（Intent Contracts を含む）
- `construction/<unit-id>-<slug>/functional-design/domain-entities.md`
- `construction/<unit-id>-<slug>/functional-design/frontend-components.md`（UI がある場合のみ）
- `construction/<unit-id>-<slug>/functional-design/memory.md`
- `aidlc-state.md`（対象 Unit の checkbox）と `audit/audit.md`（ゲートイベントの追記）
- 質問を行った場合は `construction/<unit-id>-<slug>/functional-design/functional-design-questions.md`

Functional Design の承認後に Domain Map と Context Map へ昇格する候補を、`domain-entities.md` の `Domain Map と Context Map への反映候補` に記録する。
対象 Unit の Functional Design が承認済みで、共有境界として採用する判断がある場合は Domain Map、コンテキスト間依存として採用する判断がある場合は Context Map を、`adopted` または `retired` の現在の索引として更新する。
Domain Map と Context Map には候補を載せない。

## 手順

以下の手順は、checkbox が `[ ]` から開始する場合の流れである。
`[?]` または `[R]` からの再開では、前提の再開規則に従い、ゲートの再提示または修正に必要な手順だけを実行する。

1. checkbox が `[ ]` の場合だけ Condition を判定する。偽なら対象 Unit を `[S]` にし、`STAGE_SKIPPED` を追記して終了する。`[-]`、`[?]`、`[R]` からの再開では再判定しない。
2. 対象 Unit の `functional-design` の checkbox を `[-]` にする。
3. 対象 Unit、要求、Application Design、ドメインの判断材料を読み、本物の欠落だけを質問で確認する。Application Design を実行しなかった場合は、前提の縮退時の入力代替に従い、使った代替を `business-logic-model.md` に記録する。
4. `business-logic-model.md`、`business-rules.md`、`domain-entities.md` を作る。UI がある場合は `frontend-components.md` も作る。
5. `construction/<unit-id>-<slug>/functional-design/memory.md` に、実行中の解釈、逸脱、トレードオフ、未解決の問いを記録する。
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

承認（Accept as-is を含む）の後で、`domain-entities.md` の `Domain Map と Context Map への反映候補` のうち採用判断が確定したものだけを、Domain Map と Context Map へ反映する。
autonomy により会話内ゲートを提示しなかった場合は、この skill は反映を行わない。
その場合の反映は、Bolt PR の merge 後に `amadeus` 入口の Bolt 境界処理が行う。

## 禁止事項

- 新しい業務ロジックのない単純な変更に対して実行しない。
- 実装、テストコード、Bolt 記録（`bolts/**`）を作らない。
- Domain Map と Context Map に候補を載せない。反映は承認済みの採用判断だけにする。
- 承認を待たずに checkbox を `[x]` にしない。

## 次の skill

- 続きを進める場合: `amadeus`（入口が Bolt 内の次ステージを解決する）
- ドメインモデルを能動的に磨く場合: `amadeus-domain-modeling`
- 成果物の構造検証: `amadeus-validator`
