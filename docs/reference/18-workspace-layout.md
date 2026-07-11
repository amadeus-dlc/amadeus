# Workspace Layout Decision

> Languages: **English** | [日本語](18-workspace-layout.ja.md)

## Context

GitHub issue #610 は、Amadeus repository の workspace/package layout を正規化するための課題である。従来は framework source of truth を root-level の `core/` と `harness/` に置き、setup/installer 系の作業だけを将来 `packages/setup/` に置く前提だった。

このままだと、framework source は root、setup package は `packages/` という責務軸が混在する。`packages/setup` を別 intent で進める前に、framework 側も package-owned source boundary を持つ必要がある。

## Decision

Amadeus は framework の authored source を `packages/framework/` に移す。

- `packages/framework/core/` を harness-neutral source of truth とする。
- `packages/framework/harness/<name>/` を harness-specific authored source とする。
- `packages/framework/package.json` を framework package boundary として追加する。
- root `scripts/` は repository-level packaging/self-promotion tooling として維持する。
- root `dist/<name>/` は generated かつ committed public install contract として維持する。
- root `.claude/`, `.codex/`, `.agents` は dogfood self-install targets として維持する。
- root `core` と `harness` は既存 docs/tests/import 互換の alias として残す。
- `packages/setup` は別 intent の sibling package として扱い、この framework migration の implementation target には含めない。

```text
packages/framework/core/        # framework source of truth
packages/framework/harness/     # harness-specific authored source
packages/framework/package.json # framework package boundary
core -> packages/framework/core       # compatibility alias
harness -> packages/framework/harness # compatibility alias
scripts/                       # repository-level packaging/self-promotion tooling
dist/<name>/                    # public committed distribution output
.claude/.codex/.agents          # dogfood runtime install targets
packages/setup/                 # sibling package, handled by separate intent
```

## Alternatives Considered

### Status quo without explanation

Root-level `core/`, `harness/`, `scripts/`, `dist/` を維持するだけで、`packages/setup` との混在を説明しない案。

この案は変更が最小だが、Issue #610 の目的である MECE な package-owned boundary を満たさないため採用しない。

### Full workspace normalization including scripts and dist

Framework 側を `packages/framework/{core,harness,dist,scripts}` へすべて移す案。

この案は package-owned 境界として最も一貫するが、`dist/` は README や install command が参照する public install source である。また `scripts/package.ts` と `scripts/promote-self.ts` は repository-level の build/release guard として CI や contributor workflow に直接結合している。

現時点では採用しない。`core` と `harness` の source boundary だけを package-owned に移し、`scripts` と `dist` は root contract として維持する。

### Source alias only

`packages/framework/` を追加せず、root `core/` と `harness/` を残したまま docs だけを更新する案。

この案は実装リスクが低いが、Issue #610 が求める workspace layout 正規化には届かないため採用しない。

## Path Impact

| Area | New contract | Impact |
| --- | --- | --- |
| `scripts/package.ts` | source root は `packages/framework/core` と `packages/framework/harness`、output は root `dist` | `CORE_ROOT` / `HARNESS_ROOT` を package-owned path に変更する |
| `scripts/promote-self.ts` | root `dist/claude`, root `dist/codex` から root `.claude/.codex/.agents` へ同期する | 変更なし |
| `scripts/manifest-types.ts` | manifests は package-owned harness から root `scripts` の shared contract を import する | import path を更新する |
| `dist/*` | generated かつ committed public install source | root に維持する |
| `.claude/.codex/.agents` | repository dogfood runtime install target | root に維持する |
| `tsconfig.json` | authored TypeScript source includes `packages/framework/core` と `packages/framework/harness` | include path を更新する |
| tests/docs | 既存 root `core` / `harness` 参照は alias で継続可能 | 段階的に package-owned path 表記へ更新する |
| `.github/workflows/ci.yml` | `dist:check` と `promote:self:check` を実行する | root script contract 維持により変更不要 |

## Guard Preservation

この decision は release/drift guard を弱めない。

- `bun run dist:check` は `packages/framework/core` + `packages/framework/harness` から root `dist/<harness>` が byte-identical に生成できることを検証する。
- `bun run promote:self:check` は root `.claude/.codex/.agents` が generated distributions と同期していることを検証し続ける。
- `bun run typecheck`, `bun run lint`, relevant `tests/run-tests.sh` profiles remain the validation path when code or tests change.

`dist/` を移動しないため、existing install commands と public distribution path は維持される。

## Validation Checklist

この layout に関する変更を出すときは、変更種別に応じて次を確認する。

| Change type | Required validation |
| --- | --- |
| Source path or manifest import changes | `bun run typecheck` |
| Packaging source/output path changes | `bun run dist:check` |
| Self-install, Codex/Claude runtime surface, or composed scope behavior changes | `bun run promote:self:check` |
| Documentation path wording changes | docs review and docs legacy refs gate if relevant |
| Behavior changes touching harness runtime flows | relevant `tests/run-tests.sh` profile |

## Consequences

### Positive

- Framework source が `packages/framework/` にまとまり、`packages/setup` と sibling package として並ぶ。
- root `dist/` public install contract を維持できる。
- root `scripts/` build/release workflow を維持できる。
- 既存 docs/tests/imports は、移行中も root `core` と `harness` alias 経由で継続できる。

### Negative

- root `core` / `harness` aliases are transitional compatibility surface and must not become a second source of truth.
- 一部 docs/tests はまだ root `core/` と `harness/` に言及する。これは互換 alias として有効だが、source of truth を説明する文脈では段階的に `packages/framework/` 表記へ更新する。
- Full relocation of `scripts/` or `dist/`, if desired later, still requires a dedicated migration intent.

## Future Migration Trigger

Reconsider moving root `scripts/` only if framework packaging becomes independently releasable from the repository root.

Reconsider moving root `dist/` only if install commands and public distribution expectations can be changed deliberately across README, docs, tests, CI, and self-promotion.

## Potential Follow-Up Slices

### Documentation path cleanup

Goal: root `core/` / `harness/` prose referencesを、source of truth では `packages/framework/core` / `packages/framework/harness` と書くように段階更新する。

Non-goal: runtime `.claude/.codex/.agents` や root `dist/` の説明を変えない。

Guard commands:

- docs review
- `bun tests/run-tests.ts --unit --filter t174-docs-legacy-refs-gate`

### Alias retirement readiness

Goal: root `core` / `harness` alias に依存する tests/imports/docs を棚卸しし、将来 alias を消せるか判断する。

Non-goal: この issue で alias を削除しない。

Guard commands:

- `bun run typecheck`
- relevant `tests/run-tests.sh` profile

### Scripts package boundary

Goal: `scripts/` を root に残すか、将来 `packages/framework/scripts` に移すかを再評価する。

Non-goal: `dist/` の移動を同時に行わない。

Guard commands:

- `bun run dist:check`
- `bun run promote:self:check`
