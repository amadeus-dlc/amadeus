# Application Design Memory

## Interpretations

- 2026-07-07T07:18:00Z — Application Design は runtime service design ではなく、repository layout architecture decision として扱った。
- 2026-07-07T07:18:00Z — `requirements`, `architecture`, `component-inventory`, `team-practices` の根拠から、即時の full workspace normalization ではなく root framework layout 維持 + sibling `packages/setup` を推奨した。
- 2026-07-07T07:18:00Z — Markdown 本文は日本語で作成し、path、CLI、file name、ADR 用語などの識別子は正確性のため英語表記を残した。

## Deviations

- 2026-07-07T07:18:00Z — UI/AWS/service communication の質問は生成しなかった。この intent は UI や cloud service を含まず、repository layout decision が対象であるため。

## Tradeoffs

- 2026-07-07T07:18:00Z — Full normalization は MECE 性を高めるが、`dist/` relocation と `promote-self` 影響が大きいため、現時点では設計上の採用を見送る案を推奨した。
- 2026-07-07T07:18:00Z — 将来の migration 可能性は閉じず、source root abstraction を first safe slice として分離できる設計にした。

## Open questions

- 2026-07-07T07:18:00Z — Units Generation で、設計記録/ADR 作成と docs 更新をどの単位に分割するか決める。
