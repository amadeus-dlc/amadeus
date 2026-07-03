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

対象 record の `aidlc-state.md` で、Stage Progress の `rough-mockups` が実行対象であり、checkbox が `[ ]`、`[-]`、`[?]`、`[R]` のいずれかであることを前提にする。

checkbox が `[?]` の場合は、成果物を作り直さず、ゲートの提示から再開する。
checkbox が `[R]` の場合は、前回の成果物と差し戻し理由を提示してから、修正だけを行う。
どちらの場合も、手順を最初からやり直さない。

Condition は「UI が対象に含まれる場合。API や backend はシステム相互作用図で代替する」である。
UI もシステム相互作用もない場合は、成果物を作らず checkbox を `[S]` にして注記に skip 理由を書き、`STAGE_SKIPPED` イベントを `audit/audit.md` に追記して `amadeus` へ戻る。

少なくとも次を読む。

- `aidlc/spaces/<space>/intents/<dirName>.md`
- `aidlc-state.md`
- `ideation/scope-definition/scope-document.md` と `intent-backlog.md`

## 質問

次の論点を確認する。

- 利用者が最初に確認したい画面または相互作用はどれか。
- 主要なフローの開始点と終了点はどこか。

質問は `amadeus-grilling` のプロトコルに従い、一問ずつ、推奨回答を添えて提示し、回答を待つ。
質問の量は `aidlc-state.md` の `Depth` を目安にする。
質問と回答は `ideation/rough-mockups/rough-mockups-questions.md` に記録する。

## テンプレート

優先順位は次である。

1. `aidlc/spaces/<space>/memory/templates/intents/ideation/rough-mockups/`
2. この skill に同梱された `templates/ideation/rough-mockups/`

図は Markdown に内包できる PlantUML または Mermaid で書く。
分からない項目は空欄にせず、`未確認` と書く。

## 成果物

作成または更新するものは次だけである。

- `ideation/rough-mockups/wireframes.md`（UI がない場合はシステム相互作用図）
- `ideation/rough-mockups/user-flow.md`
- `ideation/rough-mockups/rough-mockups-questions.md`
- `ideation/rough-mockups/memory.md`（stage 実行の学習記録）
- `aidlc-state.md`（対象ステージの checkbox）と `audit/audit.md`（ゲートイベントの追記）

## 手順

以下の手順は、checkbox が `[ ]` から開始する場合の流れである。
`[?]` または `[R]` からの再開では、前提の再開規則に従い、ゲートの再提示または修正に必要な手順だけを実行する。

1. checkbox が `[ ]` の場合だけ Condition を判定する。偽なら checkbox を `[S]` にして注記に skip 理由を書き、`STAGE_SKIPPED` を追記して終了する。`[-]`、`[?]`、`[R]` からの再開では再判定しない。
2. `aidlc-state.md` の `rough-mockups` の checkbox を `[-]` にする。
3. scope-document と intent-backlog を読み、確認対象のフローを特定する。
4. 不足論点を質問で確認する。
5. `wireframes.md` と `user-flow.md` を作る。
6. stage の `memory.md` に、実行中の解釈、逸脱、トレードオフ、未解決の問いを記録する。
7. `aidlc-state.md` の `rough-mockups` の checkbox を `[?]` にし、`STAGE_AWAITING_APPROVAL` イベントを `audit/audit.md` に追記して、ゲートを提示する。

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

- 高忠実度の UI やデザインシステム対応を作らない。詳細化は Inception の Refined Mockups が扱う。
- 要求、Unit、Bolt、実装を作らない。
- 承認を待たずに `completed` を記録しない。

## 次の skill

- 続きを進める場合: `amadeus`（入口が次ステージを解決する）
- 成果物の構造検証: `amadeus-validator`
