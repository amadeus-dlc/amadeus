# コンポーネント棚卸し

## Repository-Level Components

| コンポーネント | 責務 | 主な依存 | Health |
|---|---|---|---|
| Framework Core | lifecycle、graph、state、audit、artifact/sensor guard | Bun、filesystem | at-risk |
| Harness Adapters | 8 host 向け filesystem/UI integration | Core、host conventions | healthy |
| Plugin Runtime | compose/drop、stage/tool/sensor projection | Core graph、filesystem | healthy |
| PR Convergence Plugin | PR delivery loop と report | `gh`、GitHub、record | degraded |
| Build/Packaging | deterministic `dist/<harness>` と self promotion | Bun、manifest | healthy |
| Test System | smoke/unit/integration/e2e/conformance | Bun test、fixtures | at-risk |
| Workflow Record Store | Intent state、audit、artifacts、CodeKB | Markdown/JSON filesystem | healthy |

## PR Convergence Components

| コンポーネント | 責務 | 依存 | Health / 根拠 |
|---|---|---|---|
| Host activation/config | plugin 有効化、4 self-* binding | `amadeus/config.json` | healthy — 配線済み |
| Scope binding compiler | binding を stock/composed grid に加算 | config、plugin stage metadata | healthy — 非 self opt-in を保持 |
| Plugin manifest | stage/tool と code-generation produces seam の宣言 | plugin composer | healthy |
| Plugin stage contract | convergence loop、manual sensor fire、merge 非権限 | CLI、sensor | degraded — own produces/requires/sensors が空 |
| CLI dispatcher | `create/status/report/override` | adapter、predicate、ledger | at-risk — local delivery precondition 不在 |
| GitHub runner | auth probe、GraphQL/PR create boundary | `gh` CLI | healthy |
| Lifecycle/predicate | active/merged と convergence 判定 | raw PR state | healthy |
| Review ledger | all-page thread classification | GitHub GraphQL | healthy |
| PR provenance checker | Intent/Bolt/Unit と title/body の一致 | record registry、snapshot | healthy |
| Presentation renderer | canonical linked PR title/body | intent reference | healthy |
| Report renderer/writer | canonical Markdown の生成 | convergence facts、filesystem | degraded — attestation 不在 |
| Report format sensor | required field と自己矛盾の検査 | report filesystem | degraded — shape-only/advisory |
| Orchestrator coverage | per-unit required produces の全件存在 | compiled graph、filesystem | healthy on normal engine path |
| State artifact guard | direct transition の evidence check | compiled graph、filesystem | degraded — any-one artifact semantics |
| Blocking sensor guard | blocking sensor の fired/passed 要求 | graph severity、audit | healthy generic mechanism、未配線 |

## Ownership Gaps

- CLI execution receipt の発行 owner がない。
- report content digest と audit identity の binding owner がない。
- receipt/digest の completion-time verification owner がない。
- local branch/commit/push/head SHA precondition の検査 owner がない。
- pr-convergence stage と code-generation overlay の間で report lifecycle owner が分散している。
