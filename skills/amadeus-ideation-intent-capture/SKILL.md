---
name: amadeus-ideation-intent-capture
description: >-
  Amadeus Ideation の内部 skill。Stage 1.1 Intent Capture & Framing だけを実行する。
  Birth 済み Intent の目的、対象、成功条件、契機を clarifying questions で確定し、
  intent-statement.md と stakeholder-map.md を作成または補修する場面では必ず使う。
  scope-document、intent-backlog、要求、Unit、Bolt、実装は作らない。
---

# amadeus-ideation-intent-capture

## 目的

Ideation の Stage 1.1 Intent Capture & Framing だけを進める。

この skill は `amadeus` 入口から呼び出される内部 skill である。

Birth で作られた Intent の骨格に対して、解決する問題、対象者、観測可能な成功基準、契機を clarifying questions で確定して `intent-statement.md` を作り、利害関係者の整理を作る。

## 前提

対象 record の `aidlc-state.md` で、Stage Progress の `intent-capture` が実行対象であり、checkbox が `[ ]`、`[-]`、`[?]`、`[R]` のいずれかであることを前提にする。

checkbox が `[?]` の場合は、成果物を作り直さず、ゲートの提示から再開する。
checkbox が `[R]` の場合は、前回の成果物と差し戻し理由を提示してから、修正だけを行う。
どちらの場合も、手順を最初からやり直さない。

少なくとも次を読む。

- `aidlc/spaces/<space>/intents/<dirName>.md`
- `aidlc-state.md`
- Space の `memory/` と `knowledge/`

## 質問

次の論点を確認する。

- 何の業務問題または技術課題を解くのか。
- 対象者は誰で、どんな痛みがあるのか。
- 成功はどう観測できるのか。技術的な Intent では、保存すべき振る舞いと観測可能な改善指標は何か。
- なぜ今この作業を始めるのか（契機）。

質問は `amadeus-grilling` のプロトコルに従い、一問ずつ、推奨回答を添えて提示し、回答を待つ。
質問の量は `aidlc-state.md` の `Depth` を目安にする（Minimal 2〜4 問、Standard 5〜8 問、Comprehensive 8〜12 問以上）。
回答の曖昧さと矛盾を検出し、必要なら追加質問する。

質問と回答は `ideation/intent-capture/intent-capture-questions.md` に記録する。
成果物の意味や後続判断に影響する確定判断は、`ideation/grillings.md` と `ideation/grillings/Gxxx-<topic>.md` にも記録する。

## テンプレート

優先順位は次である。

1. `aidlc/spaces/<space>/memory/templates/intents/ideation/intent-capture/`
2. この skill に同梱された `templates/ideation/intent-capture/`

テンプレートの `<...>` は、回答と Space の `memory/` と `knowledge/` から分かる値に置き換える。
分からない項目は空欄にせず、`未確認` と書く。

## 成果物

作成または更新するものは次だけである。

- `ideation/intent-capture/intent-statement.md`（目的、対象、成功条件、契機、範囲の確定）
- `aidlc/spaces/<space>/intents/<dirName>.md`（目標プロファイルの確定）
- `ideation/intent-capture/stakeholder-map.md`
- `ideation/intent-capture/intent-capture-questions.md`
- `ideation/intent-capture/memory.md`
- `aidlc-state.md`（`intent-capture` の checkbox）と `audit/audit.md`（ゲートイベントの追記）
- `aidlc/spaces/<space>/intents/intents.md`（`bun run .agents/skills/amadeus-validator/scripts/IndexGenerate.ts <workspace>` による再生成。手書きしない）

成功条件は、Intent 受理条件の①（観測可能な成功基準）を満たす形で書く。

## 手順

以下の手順は、checkbox が `[ ]` から開始する場合の流れである。
`[?]` または `[R]` からの再開では、前提の再開規則に従い、ゲートの再提示または修正に必要な手順だけを実行する。

1. `aidlc-state.md` の `intent-capture` の checkbox を `[-]` にする。
2. モジュールファイルの骨格と Space の `memory/`、`knowledge/` を読み、不足している論点を洗い出す。
3. 質問を一問ずつ提示し、回答を `intent-capture-questions.md` に記録する。
4. `intent-statement.md` の目的、対象、成功条件、契機、範囲を確定し、モジュールファイルの目標プロファイルを確定する。
5. `stakeholder-map.md` を作る。利害関係者、決定者と影響者の区別、必要な確認先を書く。
6. `IndexGenerate.ts` で `aidlc/spaces/<space>/intents/intents.md` を再生成する。
7. stage の `memory.md` に、実行中の解釈、逸脱、トレードオフ、未解決の問いを記録する。
8. `aidlc-state.md` の `intent-capture` の checkbox を `[?]` にし、`STAGE_AWAITING_APPROVAL` イベントを `audit/audit.md` に追記して、ゲートを提示する。

## ゲート

成果物の要約と確認先パスを示し、次の 2 択で承認を求める。

- Approve：承認して次ステージへ。
- Request Changes：修正指示を受けて手直しする。

同じステージで Request Changes が 3 回続いたら、Accept as-is（現状のまま確定して先へ進む）を選択肢に加える。
ゲートを提示したターンでは人間の回答を待ち、承認なしに先へ進まない。

承認されたら checkbox を `[x]` にし、`GATE_APPROVED`（人間の回答をそのまま記録）と `STAGE_COMPLETED` を `audit/audit.md` に追記する。
差し戻されたら checkbox を `[R]` にし、`GATE_REJECTED`（差し戻し理由をそのまま記録）と `STAGE_REVISING` を追記する。
Accept as-is が選ばれた場合は、checkbox を `[x]` にし、`GATE_APPROVED`（Accept as-is である旨を含めて記録）と `STAGE_COMPLETED` を追記し、この判断を `ideation/decisions.md` に記録する。

## 禁止事項

- Birth（Intent の新規作成判断）をこの skill で行わない。Birth は `amadeus` 入口の責務である。
- `scope-document.md`、`intent-backlog.md`、`requirements.md`、Unit、Bolt、実装を作らない。
- 承認を待たずに `completed` を記録しない。
- `aidlc/spaces/<space>/intents/intents.md` を手書きしない。

## 次の skill

- 続きを進める場合: `amadeus`（入口が次ステージを解決する）
- 成果物の構造検証: `amadeus-validator`
