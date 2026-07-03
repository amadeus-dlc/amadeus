# Memory: build-and-test

## Interpretations

- B002 の Build and Test は、skill 英語化そのものだけでなく、promotion flow と英語化後の eval 契約が維持されることを確認する。
- `dev-scripts/evals/amadeus-templates/check.ts` の更新は、旧日本語文言そのものへの依存を取り除き、同じ意味の英語契約を検査するための変更である。
- `test:examples` の stale 許容ログは既存の許容事項であり、今回の変更による failure ではない。

## Deviations

- 初回の `npm run test:all` は失敗した。原因は旧日本語文言の固定検査であり、skill 英語化に伴う eval 契約更新で解消した。
- Build and Test の完了確定は、autonomous Bolt の PR merge 後に行う。

## Tradeoffs

- eval から重要文言検査を削除せず、英語化後の同等文言検査に置き換えた。これにより、意味保存の機械的な確認を残した。

## Open questions

- B002 PR に対するレビューコメントが、#401 以降の広範囲英語化に回すべき内容を含む場合は、必要に応じて follow-up Issue としてスコープアウトする。
