# Build Test Results：B005 #391〜#394 AI-DLC v2 differences

## 実行結果

| PR | コマンド | 結果 |
|---|---|---|
| PR #419（#391） | `npm run test:all`、`test:it:amadeus-templates`、`test:it:promote-skill`、Amadeus Validator、`git diff --check` | すべて pass。CI（mock）と Cursor Bugbot も pass。 |
| PR #420（#393） | 同上 | すべて pass。CI（mock）と Cursor Bugbot も pass。 |
| PR #421（#392） | `npm run test:all`、Amadeus Validator、`git diff --check`、`promote-skill`（build-and-test） | すべて pass。Bugbot 指摘 1 件（code-summary の古い節）は 019c3309 で修正し返信済み。 |
| 本 PR（#394） | `npm run test:all`、Amadeus Validator、`git diff --check` | 実行結果は本 PR の説明に記録する。 |

## 補足

`test:examples` の stale (許容) ログは、英語化と Gate 節注記による provenance staleReason の許容であり、failure ではない。real provider 再生成は後続 PR で実施する。
