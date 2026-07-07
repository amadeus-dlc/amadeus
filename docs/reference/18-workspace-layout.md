# Workspace Layout Decision

## Context

GitHub issue #610 は、Amadeus repository の workspace/package layout を明示的に判断するための設計課題である。現在の repository は、framework の source of truth を root-level の `core/`, `harness/`, `scripts/`, `dist/` に置く。一方で、installer/setup 系の作業は将来 `packages/setup` のような package-owned layout として進む予定がある。

この混在は初期 installer work の blast radius を抑えるためには妥当だったが、長期的な contributor mental model と release/drift guard の観点では、設計記録として明文化する必要がある。

## Decision

Amadeus は当面、framework layout を root-level に維持する。

- `core/` は harness-neutral source of truth として維持する。
- `harness/<name>/` は harness-specific authored source として維持する。
- `scripts/` は repository-level packaging/self-promotion tooling として維持する。
- `dist/<name>/` は generated かつ committed public install contract として root-level に維持する。
- `.claude/`, `.codex/`, `.agents` は dogfood self-install targets として root-level に維持する。
- `packages/setup` は別 intent の sibling package として扱い、この framework layout decision の implementation target には含めない。

推奨 layout model は staged mixed layout である。Framework source/distribution contract は root-level に残し、package-owned setup work は sibling package として分離する。

```text
core/                     # framework source of truth
harness/<name>/            # harness-specific authored source
scripts/                   # repository-level packaging/self-promotion tooling
dist/<name>/               # public committed distribution output
.claude/.codex/.agents     # dogfood runtime install targets
packages/setup/            # sibling package, handled by separate intent
```

## Alternatives Considered

### Status quo without explanation

Root-level `core/`, `harness/`, `scripts/`, `dist/` を維持するだけで、`packages/setup` との混在を説明しない案。

この案は変更が最小だが、Issue #610 の目的である tradeoff record と root-level 維持理由を満たさないため採用しない。

### Full workspace normalization

Framework 側も `packages/<name>/{core,harness,dist,scripts}` へ移す案。

この案は package-owned 境界として最も一貫するが、`dist/` が public install source であるため blast radius が大きい。`scripts/package.ts`, `scripts/promote-self.ts`, README/docs, tests, fixtures, `.github/workflows/ci.yml`, root `.claude/.codex/.agents` まで同時に影響する。

現時点では採用しない。

### Source root abstraction first

Directory move の前に、`scripts/package.ts` の `CORE_ROOT` / `HARNESS_ROOT` などを logical resolver 経由にする案。

これは将来 full normalization を再検討する場合の first safe slice として有効である。ただし Issue #610 の現時点の conclusion としては、実装作業を増やすより design record と docs clarity を優先する。

## Path Impact

| Area | Current contract | Impact if moved |
| --- | --- | --- |
| `scripts/package.ts` | root `core/`, root `harness/`, root `dist/` を前提に distribution を生成する | source root abstraction または script relocation が必要 |
| `scripts/promote-self.ts` | root `dist/claude`, root `dist/codex` から root `.claude/.codex/.agents` へ同期する | self-install preservation と composed scopes の扱いを再設計する必要がある |
| `scripts/manifest-types.ts` | `core/<src>` と `harness/<name>/<src>` の projection contract を定義する | package-local path contract へ移すか logical path contract を保つか決定が必要 |
| `dist/*` | generated かつ committed public install source | README/docs/tests/CI/self-promotion に user-facing impact がある |
| `.claude/.codex/.agents` | repository dogfood runtime install target | package-owned layout へ移す対象ではない |
| tests/fixtures | root `dist/*` と root scripts を参照する | fixture abstraction が必要 |
| README/docs | root `core/harness/dist` contributor model を説明する | layout decision と install command の更新が必要 |
| `.github/workflows/ci.yml` | `dist:check` と `promote:self:check` を実行する | drift guard target の再定義が必要 |

## Guard Preservation

この decision は release/drift guard を弱めない。

- `bun run dist:check` は root `dist/<harness>` が `scripts/package.ts` から byte-identical に生成できることを検証し続ける。
- `bun run promote:self:check` は root `.claude/.codex/.agents` が generated distributions と同期していることを検証し続ける。
- `bun run typecheck`, `bun run lint`, and relevant `tests/run-tests.sh` profiles remain the validation path when code or tests change.

Directory move を行わないため、この decision 自体は generated `dist/<harness>/` の手編集を必要としない。

## Validation Checklist

この decision に関する変更を出すときは、変更種別に応じて次を確認する。

| Change type | Required validation |
| --- | --- |
| Design record or docs only | Markdown review; confirm install paths and root layout wording remain consistent |
| Packaging, manifest, or distribution path changes | `bun run dist:check` |
| Self-install, Codex/Claude runtime surface, or composed scope behavior changes | `bun run promote:self:check` |
| TypeScript source or test helper changes | `bun run typecheck` and `bun run lint` |
| Behavior changes touching harness runtime flows | relevant `tests/run-tests.sh` profile |

この Issue #610 decision は docs/design-focused であり、directory move を行わない。したがって、Build and Test stage では docs consistency と、必要に応じた drift guard command を確認する。

## Consequences

### Positive

- Existing packaging and self-promotion flow remains stable.
- Maintainers keep the simple contributor rule: edit `core/` or `harness/<name>/`, regenerate `dist/`.
- `packages/setup` can proceed independently without forcing framework source into package-local layout.
- Issue #610 can be closed with an explicit design rationale rather than an implicit staged layout.

### Negative

- The repository remains mixed: root framework zones plus package-owned setup zones.
- MECE clarity depends on docs and this design record being kept current.
- Full workspace normalization, if desired later, still requires a dedicated migration intent.

## Future Migration Trigger

Reconsider full workspace normalization only if at least one of these becomes true:

- multiple independently releasable framework packages exist;
- root-level `core/` / `harness/` becomes a blocker for release or ownership;
- `packages/setup` needs shared framework source that cannot be expressed as a sibling dependency;
- tests/docs/CI have been prepared with source root and fixture abstraction.

If reopened, the first safe slice should be source root abstraction, not a directory move.

## Potential Follow-Up Slices

Full workspace normalization を将来再検討する場合、次の順に小さく分ける。

### Source root abstraction

Goal: `scripts/package.ts` の `CORE_ROOT`, `HARNESS_ROOT`, root `dist` assumptions を logical resolver 経由にする。

Non-goal: directory move はこの slice では行わない。

Target areas:

- `scripts/package.ts`
- `scripts/manifest-types.ts`
- harness manifests

Guard commands:

- `bun run dist:check`
- `bun run typecheck`

### Test fixture abstraction

Goal: tests が root `dist/*` を直接参照する箇所を helper に集約し、将来の output relocation を検証しやすくする。

Non-goal: install path を変えない。

Target areas:

- `tests/harness/fixtures.ts`
- `tests/harness/tui-fixtures.ts`
- packaging/self-promotion tests

Guard commands:

- relevant `tests/run-tests.sh` profile
- `bun run typecheck`

### Manifest contract seam

Goal: `coreDirs` / `harnessFiles` の `src` を package-local path にするか logical repository path にするかを切り替え可能にする。

Non-goal: all harness manifests を一度に package-local path へ移さない。

Target areas:

- `scripts/manifest-types.ts`
- `harness/*/manifest.ts`
- `harness/codex/emit.ts`

Guard commands:

- `bun run dist:check`
- `bun run promote:self:check`

### Documentation compatibility update

Goal: root framework layout と package-owned setup layout の関係を、README/docs/contributing guide で更新し続ける。

Non-goal: docs だけで behavior change を装わない。

Target areas:

- `README.md`
- `docs/README.md`
- `docs/reference/11-contributing.md`
- harness guide pages when install commands change

Guard commands:

- docs review
- docs legacy refs gate if relevant
