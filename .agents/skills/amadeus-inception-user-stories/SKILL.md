---
name: amadeus-inception-user-stories
description: >-
  Amadeus Inception の内部 skill。Stage 2.4 User Stories だけを実行する。
  利用者向け機能、複数ペルソナ、複雑な業務ロジック、チーム横断の作業がある Intent で、
  stories.md、personas.md、user-stories-assessment.md を作成または補修する場面では必ず使う。
  純粋なリファクタリング、単発のバグ修正、インフラのみの変更、開発者ツールでは実行しない。
  要求、設計、Unit、Bolt、実装は作らない。
---

# amadeus-inception-user-stories

## 目的

Inception の Stage 2.4 User Stories だけを進める。

この skill は `amadeus` 入口から呼び出される内部 skill である。

要求を人間アクターの価値表現へ落とし、ペルソナを整理する。

## 前提

対象 record の `aidlc-state.md` で、Stage Progress の `user-stories` が実行対象であり、checkbox が `[ ]`、`[-]`、`[?]`、`[R]` のいずれかであることを前提にする。

checkbox が `[?]` の場合は、成果物を作り直さず、ゲートの提示から再開する。
checkbox が `[R]` の場合は、前回の成果物と差し戻し理由を提示してから、修正だけを行う。
どちらの場合も、手順を最初からやり直さない。

Condition は「利用者向け機能、複数ペルソナ、複雑な業務ロジック、チーム横断の作業がある場合」である。
純粋なリファクタリング、単発のバグ修正、インフラのみの変更、開発者ツールの場合は、成果物を作らず checkbox を `[S]` にして注記に skip 理由を書き、`STAGE_SKIPPED` イベントを `audit/audit.md` に追記して `amadeus` へ戻る。

少なくとも次を読む。

- `inception/requirements-analysis/requirements.md`
- `aidlc-state.md`
- `aidlc/spaces/<space>/codekb/<repo>/business-overview.md` と `component-inventory.md`（brownfield の場合）
- `inception/practices-discovery/team-practices.md`（実行した場合）
- Space の `memory/`（アクターの定義）

## テンプレート

優先順位は次である。

1. `aidlc/spaces/<space>/memory/templates/intents/inception/user-stories/`
2. この skill に同梱された `templates/inception/user-stories/`

分からない項目は空欄にせず、`未確認` と書く。

## 成果物

作成または更新するものは次だけである。

- `inception/user-stories/stories.md`（ストーリー一覧。識別子 `S001` 以降と要求への参照を含める）
- `inception/user-stories/personas.md`
- `inception/user-stories/user-stories-assessment.md`（要求に対するストーリーの充足評価）
- `inception/user-stories/memory.md`（stage 実行の学習記録）
- `aidlc-state.md`（対象ステージの checkbox）と `audit/audit.md`（ゲートイベントの追記）
- 質問を行った場合は `inception/user-stories/user-stories-questions.md`

## 手順

以下の手順は、checkbox が `[ ]` から開始する場合の流れである。
`[?]` または `[R]` からの再開では、前提の再開規則に従い、ゲートの再提示または修正に必要な手順だけを実行する。

1. checkbox が `[ ]` の場合だけ Condition を判定する。偽なら checkbox を `[S]` にして注記に skip 理由を書き、`STAGE_SKIPPED` を追記して終了する。`[-]`、`[?]`、`[R]` からの再開では再判定しない。
2. `aidlc-state.md` の `user-stories` の checkbox を `[-]` にする。
3. 要求とアクターの定義を読み、ペルソナとストーリーを洗い出す。判断が必要な論点は `amadeus-grilling` のプロトコルで一問ずつ確認する。
4. `stories.md`、`personas.md`、`user-stories-assessment.md` を作る。
5. stage の `memory.md` に、実行中の解釈、逸脱、トレードオフ、未解決の問いを記録する。
6. `aidlc-state.md` の `user-stories` の checkbox を `[?]` にし、`STAGE_AWAITING_APPROVAL` イベントを `audit/audit.md` に追記して、ゲートを提示する。

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

- 純粋なリファクタリング、単発のバグ修正、インフラのみの変更に対して実行しない。
- ユースケース成果物（`use-cases.md`）を作らない。アクターとシステムの相互作用の詳細は Construction の Functional Design が扱う。
- 要求、設計、Unit、Bolt、実装を作らない。
- 承認を待たずに `completed` を記録しない。

## 次の skill

- 続きを進める場合: `amadeus`（入口が次ステージを解決する）
- 成果物の構造検証: `amadeus-validator`
