# Intent Capture — 質問ファイル (260805-docs-impl-sync)

モード: 自律(ユーザーが「full で自律モードでやって」と明示指示)

ユーザー承認: 2026-08-05T07:12:02Z — ユーザーが本 intent の実行方式として完全自律モードを明示的に指示(逐語「fullで自律モードでやって」)。本ファイルの [Answer] は conductor が既決規範と前回 intent 260727-docs-impl-sync の確定裁定から導出して記入した。選挙は実施していない(ソロモード・ユーザー直接指示による執行)。

判定根拠: ユーザーの発話「それもう一度やりたい」により、本 intent は 260727-docs-impl-sync と同一の目的・同一の作業種別の再実行と確定している。したがって各設問は新規の価値判断ではなく、前回確定裁定の踏襲(執行)である。前回裁定と異なる選択を要する箇所は存在しない。

既決規範(質問対象外): docs は英語正 + `amadeus/**/*.md` 日本語(project.md)、EN/JA 対訳は同一変更で同期(project.md ALWAYS)、docs 対象面の棚卸しは対象語彙の repo 全域 grep(team.md cid:requirements-analysis:enumeration-completeness-review 追補)、docs 散文の件数語は隣接列挙原則に従う(project.md cid:functional-design:c3-adjacent-enum-numerals)。

## Q1. 今回の intent の対象範囲はどこから着手しますか?

- A. README*.md + docs/ 全域の乖離監査を行い、検出された乖離を修正する(全域監査型)
- B. 直近の実装変更(git log 差分)が影響した文書のみを特定して修正する(差分駆動型)
- C. README*.md 系のみ(トップレベルの入口文書に集中)
- D. docs/guide/(ユーザーガイド)のみ
- E. docs/reference/(開発者リファレンス)のみ
- X. Other (please specify)

[Answer]: A. 全域監査型(2026-08-05、自律・前回裁定 Q1=A の踏襲)

## Q2. 乖離検出の基準時点(git log をどこまで遡るか)はどうしますか?

- A. codekb の前回 reverse-engineering observed コミット以降の実装変更を対象にする
- B. 直近 2 週間の実装変更を対象にする
- C. 文書側の最終更新以降にその文書が参照する実装が変わったものを対象にする(文書ごとの基準)
- D. 履歴に依らず、全文書を現行実装(HEAD)と突き合わせる
- X. Other (please specify)

[Answer]: D. 全域 HEAD 照合(2026-08-05、自律)。前回 intent は Q2=A で起票後に Q6 との矛盾解消で D へ変更した経緯があるため、本 intent では最初から D を採用する。git log 差分(前回 docs 着地 2026-07-27 以降)は監査の優先順位付けに使用する

## Q3. 成功基準(この intent の完了条件)は何にしますか?

- A. 検出した乖離の全件修正+EN/JA 同期+docs 系ゲート green
- B. 乖離の棚卸し目録を成果物化し、重大(ユーザーを誤誘導する)乖離のみ修正。残りは Issue 化
- C. 特定文書の正確化のみ(棚卸しは行わない)
- X. Other (please specify)

[Answer]: A. 全件修正+EN/JA 同期+docs 系ゲート green(2026-08-05、自律・前回裁定 Q3=A の踏襲)

## Q4. 新規文書の作成は含めますか?

- A. 含めない(既存文書の修正のみ)
- B. 含める(監査で判明した文書欠落を新規作成する)
- C. 含めるが、新規作成は別 intent へ送る(本 intent は欠落の特定まで)
- X. Other (please specify)

[Answer]: B. 含める(2026-08-05、自律・前回裁定 Q4=B の踏襲)

## Q5. 対象読者のうち、どの層を優先しますか?

- A. 利用者(README*.md、docs/guide/)
- B. ハーネスエンジニア(docs/harness-engineering/)
- C. コントリビュータ・開発者(docs/reference/)
- D. 全読者を均等に
- X. Other (please specify)

[Answer]: D. 全読者を均等に(2026-08-05、自律・前回裁定 Q5=A,B,C,D 全選択の踏襲)

## Q6. 実装との照合はどこまで実測で行いますか?

- A. 文書の主張を実コード(file:line)・実行結果で全件裏取りする
- B. 主要な契約(CLI・スコープ・ステージ・配布)のみ実測し、周辺記述は読解ベース
- C. 読解ベースのみ(実行はしない)
- X. Other (please specify)

[Answer]: A. 全件を実コード・実行結果で裏取り(2026-08-05、自律・前回裁定 Q6=A の踏襲)。行番号引用は observed コミットで再解決する(team.md cid:reverse-engineering:upstream-cite-reresolve-on-shift)

## Q7. 前回 intent(260727-docs-impl-sync)の成果物はどう扱いますか?

- A. 参照入力として読み、前回の契約(BR・受け入れ基準)を踏襲したうえで差分のみ更新する
- B. 参照せず、ゼロから監査をやり直す
- C. 参照するが、前回の契約は踏襲せず新たに定義する
- X. Other (please specify)

[Answer]: A. 参照入力として読み、契約を踏襲して差分のみ更新(2026-08-05、自律)。前回 record は `amadeus/spaces/default/intents/260727-docs-impl-sync/` に完全な形で残っており、コピーせず git 上の正本を参照する

## 裁定の記録

- 選挙: 実施なし。ユーザーの明示指示(2026-08-05T07:12:02Z、逐語「fullで自律モードでやって」)による自律執行。
- 判定種別: 執行(既決裁定の踏襲)。前回 intent 260727-docs-impl-sync の確定回答が一次証拠であり、新規の価値判断を含まない。
- ユーザー承認: 2026-08-05T07:12:02Z
