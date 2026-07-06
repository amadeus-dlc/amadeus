# Requirements Analysis 質問（260705-ledger-pr-docs）

対象 Issue: [#477](https://github.com/amadeus-dlc/amadeus/issues/477)

本セッションの運用方針（内容質問は推奨案で自己回答）を継続する。

---

## Q1. 常設文書の置き場所はどこにしますか？

A. `docs/amadeus/lifecycle/state.md` へ「台帳と PR 断面」の節を追加する（state 契約の正準文書に同居）
B. `docs/amadeus/` 配下の独立文書
C. PR テンプレートのみ
X. Other (please specify)

[Answer]: A（推奨採用。#477 の実施候補 1。state.md は AMADEUS.md から「state 契約の正準参照」として案内済みで、レビュー時のリンク先として最も自然。自己回答）

## Q2. PR 説明の定型文（実施候補 2）は本 Intent に含めますか？

A. 含める。ただし新規テンプレートファイルは作らず、state.md の節に「PR 説明に貼れる 1 行」を用意する最小形にする
B. .github/pull_request_template.md を新設する
C. 含めない
X. Other (please specify)

[Answer]: A（推奨採用。テンプレート新設は全 PR に影響する運用変更で本題を超える。リンク 1 行のコピー元を文書内に置けば受け入れ条件を満たす。自己回答）

## Q3. #464 の修正（Phase Progress 自動更新、phase-check 必須化）との整合はどう扱いますか？

A. 修正後挙動を正として書き、現行挙動との差分は「#464 で自動化」と注記する（sub からの申し送りどおり）
B. 現行挙動（手動整合あり）で書き、#464 merge 後に改訂する
C. phase 境界の挙動を断定せず、台帳の一般原則だけを書き、#464 の論点には「検討中」注記で言及する
X. Other (please specify)

[Answer]: C（reviewer 指摘により A から変更。#464 は OPEN で「phase-check を必須化するか validator 要求を緩和するか」が未決着のため、どちらの解決でも古くならない書き方にする。sub 申し送りの出典は agmsg 履歴 team j5ik2o-home 2026-07-05T06:41:26Z。自己回答）
