# Requirements Analysis 質問票 — 260730-open-bug-batch-3

> 判定申告(E-OC1): 本質問票の3問はいずれも**仕様裁定**(ユーザー可視契約の変更方向の確定)であり、エスカレーション正準リスト(4)によりユーザー専権 — 選挙対象外。根拠種別: Q1=方式裁定(格納契約の変更)、Q2=固定済み契約(BR-2)の明示改訂、Q3=受入条件の証拠定義。既存実装の流儀で一意に決まる事項(UX・互換性・配置)は質問せず既存パターンへ合わせる(cid:requirements-analysis:c5)。
>
> 上流入力(consumes 全数): business-overview.md、architecture.md、code-structure.md — いずれも observed 3f73823b1 断面の RE 成果物。Q1〜Q3 の機序引用は architecture.md / code-structure.md の 260730-open-bug-batch-3 focus 節に依拠する。

## Q1. #1773 — blind 独立性の修正方式

未開票中の全票本文が単一共有 tracked ファイル `ledger.json` に平文で載る(`amadeus-election-store.ts` appendBallot :464-465)。RE 実測: 流入 vector(ファイル変更通知)はハーネス側で Amadeus からは制御不能、かつ ledger.json は git tracked のため `git status`/`git diff` でも露出(第2露出面)。どの方式で修正しますか?

A. **格納分離(推奨)** — 未開票中は voter 別一時格納(例 `pending/<voter>.json`、gitignored)へ書き、tally 時に ledger.json へ統合する。通知抑制に依存せず両露出面を構造的に塞ぐ
B. 通知・プロンプト面の抑制のみ — 格納は現状維持し、voter subagent への指示強化で読ませない(git 露出面は残る)
C. A+B の両方
X. Other (please specify)

[Answer]: A. 格納分離 — 未開票中は voter 別一時格納(gitignored)へ書き、tally 時に ledger.json へ統合する

## Q2. #1772 — 選挙 CLI の本文フィールド追加範囲

`Choice = {internalNo, label}` のみで `description` は parse 時に無音 drop(fail-open)。配布 view(`DistributionView`)には設問文 `question` も無く、投票者は設問文すら受け取っていない(RE 実測)。BR-2 キー集合契約(型コメント+`t234-election-model.test.ts:190-192` の verbatim assert の3重固定)の明示改訂を伴います。追加範囲をどうしますか?

A. **description + question の両方を追加(推奨)** — Choice に本文フィールドを追加し、配布 view へ choice 本文と設問文を同梱。BR-2 が禁じる中核(推薦マーカー・先行票・peer status)は不変のまま、キー集合契約とテストを明示改訂
B. description のみ追加 — Issue 字義の最小。設問文の欠落(二次影響として Issue コメントに実測記録あり)は別対応
X. Other (please specify)

[Answer]: A. description + question の両方を追加 — BR-2 のキー集合契約とテスト(t234)を明示改訂のうえ配布 view へ同梱

## Q3. #1752 — 「create 実行済み」の証拠定義

report `--user-input create` の拒否条件が report 時点の state 再評価のため、ask の指示どおり manual create を先行実行すると自己矛盾拒否になる。受入条件「create コマンド未実行の report create は成功にしない」を保ったまま直すには「create が実行された」証拠の定義が要ります。

A. **create receipt の存在判定(推奨)** — 既存の mirror receipt(operation=create かつ succeeded)を読んで判定。新規フィールド不要で surgical(Minimal 深度に整合)。sync/skip の照合なし非対称は現状維持し、要すれば別 Issue
B. ask 発行時 binding の永続化 — 提示した選択肢を state へ記録し report で照合(`amadeus-mirror-coordinator.ts` の expectedPrompt 既習様式)。構造的により厳密だが state フィールド追加を伴う
X. Other (please specify)

[Answer]: A. create receipt の存在判定 — 既存 mirror receipt(operation=create かつ succeeded)の存在で「create 実行済み」を判定する

## 裁定の記録

- Q1=A / Q2=A / Q3=A — AskUserQuestion によるユーザー直接裁定(仕様裁定はエスカレーション正準リスト(4)によりユーザー専権、選挙対象外)。
- ユーザー承認: 2026-07-31T00:09:17Z
