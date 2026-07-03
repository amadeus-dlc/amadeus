---
name: amadeus-inception-application-design
description: >-
  Amadeus Inception の内部 skill。Stage 2.6 Application Design だけを実行する。
  新しいコンポーネントやサービス、またはサービス層の設計が必要な Intent で、
  components.md、component-methods.md、services.md、component-dependency.md、decisions.md を
  作成または補修する場面では必ず使う。既存コンポーネントの修正だけの場合は実行しない。
  Unit、Bolt、実装は作らない。
---

# amadeus-inception-application-design

## 目的

Inception の Stage 2.6 Application Design だけを進める。

この skill は `amadeus` 入口から呼び出される内部 skill である。

要求とストーリーから、コンポーネント、メソッド境界、サービス、依存関係を設計する。
この設計は Units Generation の Unit 境界の材料になる。

## 前提

対象 record の `aidlc-state.md` で、Stage Progress の `application-design` が実行対象であり、checkbox が `[ ]`、`[-]`、`[?]`、`[R]` のいずれかであることを前提にする。

checkbox が `[?]` の場合は、成果物を作り直さず、ゲートの提示から再開する。
checkbox が `[R]` の場合は、前回の成果物と差し戻し理由を提示してから、修正だけを行う。
どちらの場合も、手順を最初からやり直さない。

Condition は「新しいコンポーネントやサービスが必要な場合、またはサービス層の設計が必要な場合」である。
既存コンポーネントの修正だけの場合は、成果物を作らず checkbox を `[S]` にして注記に skip 理由を書き、`STAGE_SKIPPED` イベントを `audit/audit.md` に追記して `amadeus` へ戻る。

少なくとも次を読む。

- `inception/requirements-analysis/requirements.md`
- `inception/user-stories/stories.md`（実行した場合）
- `aidlc/spaces/<space>/codekb/<repo>/architecture.md` と `component-inventory.md`（brownfield の場合）
- `inception/practices-discovery/team-practices.md`（実行した場合）
- `aidlc/spaces/<space>/knowledge/domain-map.md` と Event Storming の成果物（存在する場合。境界の判断材料にする）
- `aidlc-state.md`

## 質問

次の論点を確認する。

- 新しいコンポーネントの責務境界はどこか。
- 既存アーキテクチャとの整合で譲れない点は何か。
- サービスの分割単位はどうするか。

質問は `amadeus-grilling` のプロトコルに従い、一問ずつ、推奨回答を添えて提示し、回答を待つ。
質問の量は `aidlc-state.md` の `Depth` を目安にする。
質問を行った場合は `inception/application-design/application-design-questions.md` に記録する。
設計の確定判断は `inception/grillings.md` と `inception/grillings/Gxxx-<topic>.md` にも記録する。

## テンプレート

優先順位は次である。

1. `aidlc/spaces/<space>/memory/templates/intents/inception/application-design/`
2. この skill に同梱された `templates/inception/application-design/`

分からない項目は空欄にせず、`未確認` と書く。

## 成果物

作成または更新するものは次だけである。

- `inception/application-design/components.md`（コンポーネント一覧と責務）
- `inception/application-design/component-methods.md`（メソッド境界）
- `inception/application-design/services.md`（サービス設計）
- `inception/application-design/component-dependency.md`（依存関係）
- `inception/application-design/decisions.md`（このステージの設計判断）
- `inception/application-design/memory.md`（stage 実行の学習記録）
- `aidlc-state.md`（対象ステージの checkbox）と `audit/audit.md`（ゲートイベントの追記）
- 質問を行った場合は `inception/application-design/application-design-questions.md`

`inception/application-design/decisions.md` はこのステージの設計判断を扱い、phase の `inception/decisions.md` とは分ける。

## 手順

以下の手順は、checkbox が `[ ]` から開始する場合の流れである。
`[?]` または `[R]` からの再開では、前提の再開規則に従い、ゲートの再提示または修正に必要な手順だけを実行する。

1. checkbox が `[ ]` の場合だけ Condition を判定する。偽なら checkbox を `[S]` にして注記に skip 理由を書き、`STAGE_SKIPPED` を追記して終了する。`[-]`、`[?]`、`[R]` からの再開では再判定しない。
2. `aidlc-state.md` の `application-design` の checkbox を `[-]` にする。
3. 要求、ストーリー、既存アーキテクチャ、ドメインの判断材料を読み、不足論点を質問で確認する。
4. 5 つの成果物を作る。各コンポーネントは対応する要求の識別子を参照する。
5. stage の `memory.md` に、実行中の解釈、逸脱、トレードオフ、未解決の問いを記録する。
6. `aidlc-state.md` の `application-design` の checkbox を `[?]` にし、`STAGE_AWAITING_APPROVAL` イベントを `audit/audit.md` に追記して、ゲートを提示する。

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

- 既存コンポーネントの修正だけの Intent に対して実行しない。
- Unit と Bolt を作らない。Unit 境界の確定は Units Generation の責務である。
- 実装とテストコードを作らない。
- 承認を待たずに `completed` を記録しない。

## 次の skill

- 続きを進める場合: `amadeus`（入口が次ステージを解決する）
- 成果物の構造検証: `amadeus-validator`
