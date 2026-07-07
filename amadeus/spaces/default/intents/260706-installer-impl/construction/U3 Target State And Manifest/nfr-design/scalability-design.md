# Scalability Design — U3 Target State And Manifest

> Stage: construction / nfr-design  
> Unit: U3 Target State And Manifest

## Scaling Model

U3はlocal single-process readerであり、horizontal scaling や distributed coordination は不要である。`scalability-requirements.md` の capacity targets は、manifest entries、sentinel checks、expected snapshot files のbounded処理として満たす。

## Capacity Boundaries

| Dimension | Design |
|---|---|
| Manifest file entries | schema validator は少なくとも2,000 entriesを単一passで処理する。 |
| Sentinel checks | supported harnessごとに固定 path table を持つ。 |
| Expected snapshot files | expected path list は metadata/manifest context から作り、2,000 filesを処理する。 |
| Target workspace size | workspace全体の大きさに依存しない。 |
| Harness ambiguity | `kiro` / `kiro-ide` の shared sentinel ambiguity を分類として扱う。 |
| Parallel invocations | process-wide mutable state を持たず、各invocationのportとcontextだけで完結する。 |

## State And Cache Strategy

U3はprocess-wide cacheを持たない。invocation-localには次の短命状態だけを許す。

- manifest read result;
- sentinel existence result per path;
- normalized expected path set;
- snapshot rows;
- diagnostics accumulator.

この範囲なら concurrent invocation が独立し、stale cache による誤分類を避けられる。

## Extension Rules

新しい harness を追加する場合は、sentinel path table、ambiguity rule、fixture tests を必須にする。dynamic discovery や recursive scan が必要になる harness はU3のscaling modelを壊すため、別unitまたは設計変更として扱う。

manifest schema migration が複数versionを持つようになった場合は、`ManifestReader` 内で version-specific parser を分離する。ただし first implementation は schemaVersion `1` のみを扱う。

## Backpressure And Concurrency

snapshot md5 はbounded concurrencyを使ってよいが、初期実装では逐次処理を基準にする。並列化する場合は、CI runnerでのIO過負荷を避けるため小さな固定上限を設ける。どちらの場合も output ordering は expected path order に揃え、U4 planning のdeterminismを保つ。

## Growth Guardrails

- target root のrecursive scanを追加しない。
- unsupported layout を自動探索で補完しない。
- multiple harness install in one invocation はU3外のscopeとして扱う。
- target-state class を増やす場合は、先にU4のplanning behaviorを定義する。

## Upstream Coverage

- `performance-requirements.md`: bounded resource constraints と benchmark対象をscaling boundaryにした。
- `security-requirements.md`: path normalization と read-only controls をscale時にも維持する。
- `scalability-requirements.md`: capacity targets、concurrency requirements、growth guardrails を直接反映した。
- `reliability-requirements.md`: deterministic output、unknown read failures、no locks/no writes を維持する。
- `tech-stack-decisions.md`: Bun single-process、ports、no daemon 方針に従う。
- `business-logic-model.md`: detection workflow と snapshot workflow を拡張境界の基準にした。
