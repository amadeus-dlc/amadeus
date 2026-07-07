# Delivery Planning Memory — インストーラの実装

## Interpretations

- 2026-07-07T07:20:00Z — team-practices.md と team-formation の合意に従い、Bolt 1 は walking skeleton として必ず人間ゲートを通す。
- 2026-07-07T07:20:00Z — Stage 2.7 の unit DAG は topology、Stage 2.8 は economic sequencing として扱い、thin walking skeleton は U1〜U5 を薄く貫通する Bolt とする。
- 2026-07-07T07:20:00Z — runtime 実装は外部依存なしで mockable とし、npm token / GitHub environment protection / publish 権限は release Bolt の gated external dependency とする。

## Deviations

- 2026-07-07T07:20:00Z — なし。Bolt 順序は unit-of-work-dependency.md の DAG を尊重し、deviation がある場合は rationale に明記する。

## Tradeoffs

- 2026-07-07T07:20:00Z — 1 Unit per Bolt は単純だが最初に end-to-end risk を検証できない。Thin walking skeleton + bundled follow-up Bolts を採用する。
- 2026-07-07T07:20:00Z — 最大並列化は速いがソロメンテナレビューと walking skeleton gate に合わない。Skeleton gate 後の限定的並列化に留める。

## Open questions

- 2026-07-07T07:20:00Z — walking skeleton 後の autonomy は Construction ladder prompt で改めて人間が選択する。

