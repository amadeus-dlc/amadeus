# Intent Capture — 質問ファイル (260727-docs-impl-sync)

モード: Guide me(2026-07-27 ユーザー選択)

ユーザー承認: 2026-07-27T06:29:01Z — 全6問の回答を AskUserQuestion 経由で本人が選択し、最終確認「はい、生成してよい」で確定(選挙不要: ソロモード・ユーザー直接回答)

既決規範(質問対象外): docs は英語正+`amadeus/**/*.md` 日本語、EN/JA 対訳は同一変更で同期(project.md ALWAYS)、docs 対象面の棚卸しは対象語彙の repo 全域 grep(team.md)。

## Q1. 今回の intent の対象範囲はどこから着手しますか?

- A. README*.md + docs/ 全域の乖離監査を行い、検出された乖離を修正する(全域監査型)
- B. 直近の実装変更(git log 差分)が影響した文書のみを特定して修正する(差分駆動型)
- C. README*.md 系のみ(トップレベルの入口文書に集中)
- D. docs/guide/(ユーザーガイド)のみ
- E. docs/reference/(開発者リファレンス)のみ
- X. Other (please specify)

[Answer]: A. 全域監査型(2026-07-27、Guide me)

## Q2. 乖離検出の基準時点(git log をどこまで遡るか)はどうしますか?

- A. codekb の前回 reverse-engineering observed コミット以降の実装変更を対象にする
- B. 直近 2 週間の実装変更を対象にする
- C. 文書側の最終更新以降にその文書が参照する実装が変わったものを対象にする(文書ごとの基準)
- D. 履歴に依らず、全文書を現行実装(HEAD)と突き合わせる
- X. Other (please specify)

[Answer]: A. 前回 RE observed 以降(2026-07-27、Guide me)→ Q6 の矛盾解消により採用値は D(全域 HEAD 照合)へ変更。git log 差分は優先順位付けに使用

## Q3. 成功基準(この intent の完了条件)は何にしますか?

- A. 検出した乖離の全件修正+EN/JA 同期+docs 系ゲート green
- B. 乖離の棚卸し目録を成果物化し、重大(ユーザーを誤誘導する)乖離のみ修正。残りは Issue 化
- C. 特定文書の正確化のみ(棚卸しは行わない)
- X. Other (please specify)

[Answer]: A. 全件修正+EN/JA 同期+docs 系ゲート green(2026-07-27、Guide me)

## Q4. 新規文書の作成は含めますか?

- A. 更新のみ(既存文書の乖離修正に限定)
- B. 更新+明白に欠けている文書の新規作成も含む(例: 新機能で docs 未記載のもの)
- X. Other (please specify)

[Answer]: B. 更新+欠落の新規作成(2026-07-27、Guide me)

## Q5. 読者の優先順位はどうしますか?(select all that apply — 優先する読者)

- A. 利用者(README、docs/guide/)
- B. ハーネスエンジニア(docs/harness-engineering/)
- C. コントリビュータ・開発者(docs/reference/)
- D. 全読者均等
- X. Other (please specify)

[Answer]: A, B, C, D — 全読者均等(優先順位を付けない)(2026-07-27、Guide me)

## Q6.(フォローアップ — 矛盾解消)Q1=A(全域監査)と Q2=A(前回 RE observed 以降の差分基準)の整合はどう取りますか?

差分基準は「前回 RE 以降に変わった実装」しか検出対象にしないため、それ以前から存在する乖離は全域監査の対象から漏れます。

- A. 全域 HEAD 照合を正とする: 全文書を現行実装と突き合わせる(Q2 を D へ変更)。git log 差分はホットスポットの優先順位付けに使う
- B. 差分基準を正とする: 検出は前回 RE observed 以降の実装変更起点に限定する(Q1 の「全域」は走査範囲の意味であり、それ以前からの乖離は対象外でよい)
- X. Other (please specify)

[Answer]: A. 全域 HEAD 照合を正とする — Q2 の採用値は D へ変更(git log 差分・RE 差分リフレッシュはホットスポットの優先順位付けに使用)(2026-07-27、Guide me)
