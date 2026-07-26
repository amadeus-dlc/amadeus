# Domain Entities — U2 visualize-hardening

上流入力(consumes 全数): unit-of-work.md, unit-of-work-story-map.md, requirements.md, components.md, component-methods.md, services.md

## U1 からの型変更

| 構造 | U1 | U2 | 根拠 |
|---|---|---|---|
| `ArgsOutcome` | `{kind:"ok"; mode:"write"} \| {kind:"usage"; reason:string}` | `{kind:"ok"; mode:"write" \| "check"} \| {kind:"usage"; reason:string}` | U1 domain-entities の予約拡張点(cross-unit-type-verbatim-check — U1 正本の型へ mode 値を1つ追加する最小拡張) |

## U2 新設シンボル(metrics-visualize.ts ローカル)

| シンボル | 形 | 意図 |
|---|---|---|
| `MAX_HTML_BYTES` | `const`(named、導出式コメント付き) | requirements.md FR-6。`16_384 * METRICS_RETENTION_KEEP_LAST * 2` — 前者はローカルミラー(ADR-3 ピンテスト対象)、後者は metrics-retention.ts:25 の既存 export を import |
| `regressionClass` | `(collector: string, key: string, prev: unknown, curr: unknown) => string` | component-methods.md の固定契約。戻りは `"regressed"` または `""`(class 名の単一定義) |

- 新しいドメイン型は作らない(U1 と同方針)。CI ステップ・docs はコード型を持たない成果物
