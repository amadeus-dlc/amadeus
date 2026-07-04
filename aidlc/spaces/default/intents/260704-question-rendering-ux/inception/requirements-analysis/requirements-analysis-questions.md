# Requirements Analysis — 質問

Intent: 260704-question-rendering-ux
対象 Issue: #448、#449、#450（質問レンダリング UX の統合改善）

## Q1. 表示言語規則（#448）の適用範囲と回答記録の扱い

structured question のユーザー向け表示を会話言語に合わせるとき、適用範囲と、質問ファイルへの回答記録の言語をどうするか。

A. **すべての structured question**（mode 選択、gate 承認、ステージ質問の対話提示）の prompt / label / description を会話言語で表示する。質問ファイルと spec（英語）は真実の記録のまま維持し、回答の書き戻しは正準ラベル（英語）+ 表示訳の併記とする
B. mode 選択と Grill me の質問だけを会話言語にし、gate 承認（Approve / Request Changes）は英語のまま残す
C. 表示は会話言語、記録も会話言語で書き戻す（既存の「回答は label をそのまま記録する」規則を変更する）
X. Other (please specify)

[Answer]: A — すべての structured question を会話言語で表示する。質問ファイルと spec は英語のまま維持し、書き戻しは正準ラベル（英語）+ 表示訳の併記とする

## Q2. Codex annex（#449）の構成と request_user_input 不可時のフォールバック

`request_user_input` が既定で有効かは未確認である。annex の構成とフォールバックをどうするか。

A. `skills/amadeus/references/question-rendering-codex.md` を追加し、既存 annex（Claude Code 用）と対にする。`request_user_input` が使えない場合の**テキスト提示の書式**（1 問ずつ、番号付き選択肢、[Answer]: 記入案内）も annex に契約として明文化し、劣化を無規定にしない
B. 既存 annex を harness 分岐込みの 1 ファイルへ統合する（Claude Code 節 + Codex 節）
C. Codex annex は request_user_input の有効性を確認できてから追加する（本 Intent では調査のみ）
X. Other (please specify)

[Answer]: A — `question-rendering-codex.md` を追加して既存 annex と対にする。request_user_input 不可時のテキスト提示書式も契約として明文化する

## Q3. Grill me の構造化 UI 契約（#450）の内容

Grill me の各質問を構造化 UI で出す契約を annex / engine-bridge に明文化するとき、レンダリング規則をどう定めるか。

A. 「1 回のツール呼び出しに 1 問だけ」「推奨回答を先頭 option にし、ラベルに推奨マークを付ける」「推奨の根拠は question 本文に含める」「回答ごとに decision/answer 記録と [Answer]: 書き戻し（既存 bridge 手順）」を harness 中立の規則として annex に置き、Claude Code は AskUserQuestion、Codex は request_user_input へ束縛する
B. harness ごとに別々の規則を書く（中立規則の層を作らない）
X. Other (please specify)

[Answer]: A — harness 中立のレンダリング規則を annex に置き、Claude Code は AskUserQuestion、Codex は request_user_input へ束縛する
