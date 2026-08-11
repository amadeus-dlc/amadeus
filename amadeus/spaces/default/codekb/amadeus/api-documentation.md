# API ドキュメント

## External CLI Surface

本リポジトリに HTTP server API はない。Issue #2838 の外部境界は plugin CLI と `gh` である。

### `create`

```text
bun <harness>/plugins/pr-convergence/tools/pr-convergence-cli.ts create \
  --repo <owner/repo> --head <branch> --title <title> --body-file <path> \
  [--base <branch>] [--record <record> --bolt <slug> --unit <slug>]
```

- linked mode では `--record`、`--bolt`、`--unit` を3点セットで要求する。
- canonical title prefix と `## Amadeus Work` section を追加し、Intent registry の UUID/record path に結び付ける。
- `--head` は `gh pr create` に明示的に渡す。
- 現在は local branch の clean、commit 済み、push 済み、remote head SHA 一致を検査しない。
- 成功 `0`、usage/GitHub boundary failure `2`。

### `status`

```text
bun <harness>/plugins/pr-convergence/tools/pr-convergence-cli.ts status \
  --repo <owner/repo> --pr <number> --unit <slug> --record <record> [--unlinked true]
```

- GitHub GraphQL snapshot と全 review threads を読み、JSON verdict を stdout に返す。
- `0`: converged または landed、`1`: not converged、`2`: GitHub/parse failure、`3`: linked PR provenance violation。
- `--unlinked true` は PR title/body provenance だけを省略し、GitHub read と convergence 判定は省略しない。

### `report`

```text
bun <harness>/plugins/pr-convergence/tools/pr-convergence-cli.ts report \
  --repo <owner/repo> --pr <number> --unit <slug> --record <record> [--unlinked true]
```

- current PR state を再評価する。
- active PR が未収束なら exit `1` で report を書かない。
- converged または landed の場合、`<record>/construction/<unit>/code-generation/pr-convergence-report.md` を書く。
- report schema は `converged | override | landed` の3 kind。
- 現在の schema は execution receipt、report digest、audit event ID、signature を持たない。

### `override`

```text
bun <harness>/plugins/pr-convergence/tools/pr-convergence-cli.ts override \
  --repo <owner/repo> --pr <number> --unit <slug> --record <record> --reason <text>
```

- audit shards 内の最新 `HUMAN_TURN` を要求する。
- 収束済み PR の override を拒否する。
- `amadeus-log.ts decision` の成功後にのみ `override` report を書く。
- PR content provenance 検査は意図的に省略する。

## GitHub Adapter Contract

`pr-convergence-gh-runner.ts` は次を提供する。

- `parsePrRef(repo, number)` — `owner/repo` と正整数 PR 番号を検証する。
- `createGhRunner()` — `gh --version` と `gh auth status` が成功した後だけ runner を返す。
- `fetchRawPrState()` — GraphQL から `mergeable`、`mergeStateStatus`、`title`、`body`、`state`、`mergedAt`、`mergeCommit.oid`、check rollup を1 snapshot で読む。
- stderr 本文は外へ出さず短い SHA-256 digest に変換する。

## Internal Contracts

| Contract | Owner | 概要 |
|---|---|---|
| `ConvergenceReport` | `pr-convergence-cli.ts` | 3 kind の render 入力 union |
| `ConvergenceVerdict` | `pr-convergence-predicate.ts` | merge state と violating thread count による純粋判定 |
| `ThreadLedger` | `pr-convergence-ledger.ts` | paged thread の terminal/non-terminal 集計 |
| `ProvenanceVerdict` | `pr-convergence-provenance.ts` | canonical title/body と record/unit の整合性 |
| `applyPluginScopeBindings` | `amadeus-graph.ts` | host binding を既存 scope row へ加算 |
| `unitCovered` | `amadeus-orchestrate.ts` | per-unit required produces の全件存在判定 |
| `verifyStageCompletionGuards` | `amadeus-state.ts` | direct transition の artifact/sensor chokepoint |
| `evaluateReportFormat` | report sensor | Markdown field shape と自己矛盾の検査 |

## Report Format Sensor Contract

入力は `--stage` と `--output-path`。対象 basename 以外、またはファイル不在は clean pass として扱う。shape finding があっても JSON verdict を stdout に出し exit `0` となる。CLI flag 不備だけが exit `1` である。この advisory 契約は観測には適するが、Issue #2838 が要求する completion gate には不足する。
