# Decisions

## Upstream Trace

この decisions は `requirements`、`architecture`、`component-inventory`、`team-practices` を根拠にする。`requirements` の FR-1 から FR-6 は候補比較、path impact、guard preservation、`packages/setup` の sibling dependency、migration/no-migration rationale、docs impact を要求している。

## ADR-001: Framework source を `packages/framework/` に移し、`packages/setup` は sibling package として扱う

### Context

Issue #610 は、root `core/`, `harness/`, `dist/`, `scripts/` と package-owned `packages/setup` が混在する状態を明示的に設計判断するための intent である。`architecture` と `component-inventory` は、`scripts/package.ts`, `scripts/promote-self.ts`, `dist/*`, `.claude/.codex/.agents`, tests, docs, CI が root layout に強く結合していることを示している。

### Options

| Option | Pros | Cons | Reversibility |
| --- | --- | --- | --- |
| A: status quo | 変更が最小。drift guard を壊さない | `packages/setup` との mixed layout を説明しないと曖昧さが残る | 高 |
| B: staged mixed layout | framework source は安定維持しつつ、setup package を sibling として説明できる | MECE 性は docs/ADR に依存する | 高 |
| C: full workspace normalization | package-owned 境界が最も一貫する | `dist/`, self-promotion, tests, docs, CI の blast radius が大きい | 中から低 |
| D: source root abstraction first | future migration の準備になる | Issue #610 の design decision だけなら実装過多になり得る | 高 |

### Decision

推奨は Option B': staged package-owned source layout である。Framework source は `packages/framework/core` と `packages/framework/harness` に移し、`scripts/` と `dist/` は root-level repository contract として維持する。`packages/setup` は別 intent の sibling package として扱う。

### Consequences

- Issue #610 は full directory move なしで close 可能な design decision を持つ。
- README/docs/contributing guide では、root framework zone と package-owned setup zone の違いを明文化する必要がある。
- Future full normalization は禁止しないが、source root abstraction と drift guard preservation を first slice にする。

### Alternatives Rejected

- Full workspace normalization を即時採用しない。理由は、`dist/` が public install source であり、`promote-self`, tests, docs, CI への影響が大きすぎるため。
- Status quo を説明なしで放置しない。理由は、Issue #610 の acceptance criteria が tradeoff record と root-level 維持理由を要求しているため。

## ADR-002: `dist/` は root-level public install contract として維持する

### Context

`dist/` は generated output である一方、README/docs の install command、tests fixtures、self-promotion、CI drift guard の anchor でもある。`requirements` FR-3 と `team-practices` は `dist:check` と `promote:self:check` の維持を要求している。

### Decision

この intent の推奨設計では root `dist/<harness>/` を維持する。`dist/` を package-local output に移す設計は、将来の別 migration decision とする。

### Consequences

- Existing install examples と tests の blast radius を抑えられる。
- `packages/setup` が存在しても、framework distribution output は root contract として説明する必要がある。
- 将来移す場合は install docs、fixtures、self-promotion、CI を同時に更新する migration plan が必要になる。

### Alternatives Rejected

- `packages/amadeus/dist/<harness>` へ移す案は、現時点では過大である。
- root `dist/` と package-local `dist/` を同時に持つ互換期間は、重複 generated output の drift risk があるため first choice にはしない。

## ADR-003: Manifest path contract は当面維持する

### Context

`scripts/manifest-types.ts` と `packages/framework/harness/*/manifest.ts` は、`packages/framework/core/` と `packages/framework/harness/<name>/` から root `dist/<name>` へ projection する contract である。root `core` と `harness` は互換 alias として残す。

### Decision

この intent の推奨設計では manifest path contract を維持する。将来 migration する場合は、manifest contract を直接壊す前に source root abstraction を導入する。

### Consequences

- Current packager behavior と drift guard が保たれる。
- Future migration の最初の implementation slice は、directory move ではなく path resolution seam の導入になる。

### Alternatives Rejected

- manifest を即 package-local path に変更しない。理由は、all harness manifests, packager, tests, docs を同時更新する必要があり、Issue #610 の design scope を超えるため。

## ADR-004: `packages/setup` はこの intent の実装対象にしない

### Context

User clarified that `packages/setup` will be handled by a separate intent and should proceed in parallel. Requirements FR-4 も sibling dependency として扱うことを要求している。

### Decision

`packages/setup` は local filesystem evidence や implementation target として扱わない。Design artifacts では coordination point としてのみ参照する。

### Consequences

- この intent の成果物は framework layout decision に集中する。
- `packages/setup` 側の intent は、この design record を参照して framework boundary と衝突しないようにできる。

### Alternatives Rejected

- `packages/setup` をこの workflow に吸収しない。目的と成果物が混ざり、Issue #610 の判断がぼやけるため。
