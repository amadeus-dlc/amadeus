# Memory: build-and-test

## Interpretations

- B003 の Build and Test は、順序計画文書と Amadeus DLC 成果物構造を検証する。
- skill 本文を変更していないため、昇格フローは不要である。
- `test:examples` の stale 許容ログは既存の許容事項であり、今回の変更による failure ではない。

## Deviations

- #391、#392、#393、#394 の Issue body は直接編集していない。
- PR 作成後に必要であれば、各 Issue へ計画文書を参照するコメントを追加する。

## Tradeoffs

- Issue 本文を直接編集せず、PR で review できる文書を追加した。変更履歴と承認証跡を Git に残すためである。

## Open questions

- #391 以降の PR でどの stage skill を最初に更新するかは、各 Issue の実装時に判断する。
