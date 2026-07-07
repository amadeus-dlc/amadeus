# Requirements Analysis Memory

## Interpretations

- 2026-07-07T07:12:00Z — 上流の `intent-statement`, `scope-document`, CodeKB, `team-practices` が十分に具体的だったため、追加質問なしで要求化した。
- 2026-07-07T07:12:00Z — 要求は layout の結論そのものではなく、次工程で status quo / staged layout / full workspace normalization を比較・決定できる検証可能条件として定義した。
- 2026-07-07T07:12:00Z — ユーザーの「Markdown は日本語」指示を反映し、成果物本文は日本語で作成した。path、CLI、コード識別子、`ALWAYS` / `NEVER` などの機械可読語は保持した。

## Deviations

- 2026-07-07T07:12:00Z — Stage prose は clarifying questions を原則生成するが、今回は6観点の要求カバレッジが上流 artifact で満たされていたため、質問ファイルには追加質問なしの判断を記録した。

## Tradeoffs

- 2026-07-07T07:12:00Z — 実装要件よりも設計判断要件を優先した。Issue #610 は blind directory move ではなく repository architecture decision のため。

## Open questions

- 2026-07-07T07:12:00Z — Application Design で、`dist/` を root-level public install contract として残すか、package-local output にするかを決定する必要がある。
- 2026-07-07T07:12:00Z — Application Design で、manifest path を package-local relative path にするか repository-wide logical path として保つかを決定する必要がある。
