# Component Methods

## Upstream Trace

この artifact は `requirements` の FR-2/FR-3、`architecture` の packaging/self-promotion transaction、`component-inventory` の high sensitivity components、`team-practices` の validation posture を設計 interface として整理する。

## Repository Layout Decision Interface

| Interface | Input | Output | Error / Guard |
| --- | --- | --- | --- |
| `compareLayoutCandidates()` | status quo, staged mixed layout, full workspace normalization, low-risk variant | tradeoff table and recommendation | candidate が `dist:check` / `promote:self:check` impact を説明しない場合は不合格 |
| `recordLayoutDecision()` | chosen option, alternatives, consequences | ADR または同等の design record | `packages/setup` を同一 intent の実装対象に含めた場合は不合格 |
| `inventoryPathImpact()` | CodeKB path-impact evidence | path impact matrix | `scripts/package.ts`, `scripts/promote-self.ts`, `dist/*`, runtime dirs, tests, docs, CI のいずれかが欠落した場合は不合格 |
| `planMigrationIfSelected()` | chosen migration option | staged migration plan | directory move と behavior change を同一 slice に混ぜる場合は不合格 |
| `explainNoMigrationIfSelected()` | chosen no-migration option | root-level layout rationale | root `core/` / `harness/` の維持理由がない場合は不合格 |

## Packaging Tooling Interface

| Interface | Input | Output | Error / Guard |
| --- | --- | --- | --- |
| `bun scripts/package.ts [<harness>]` | root `core/`, root `harness/<name>`, harness manifest | root `dist/<name>` | source root が変わる案では abstraction が必要 |
| `bun scripts/package.ts --check` | generated temp tree, committed root `dist/<name>` | drift pass/fail | `dist/` relocation 案では check target の再定義が必要 |
| manifest projection | `coreDirs`, `harnessFiles`, optional emitter | distribution tree | package-local path 化する場合は manifest contract migration が必要 |

## Self-Promotion Interface

| Interface | Input | Output | Error / Guard |
| --- | --- | --- | --- |
| `bun scripts/promote-self.ts --check` | root `dist/claude`, root `dist/codex`, root runtime dirs | self-install drift pass/fail | root `.claude/.codex/.agents` preservation を壊す案は不合格 |
| `bun scripts/promote-self.ts --apply` | generated distributions | updated `.claude`, `.codex`, `.agents` | local settings と composed scopes を preserve できない案は不合格 |

## Documentation Interface

| Interface | Input | Output | Error / Guard |
| --- | --- | --- | --- |
| `updateContributorModel()` | chosen layout decision | README/docs contributor explanation | source of truth と generated output の区別が曖昧なら不合格 |
| `updateInstallExamples()` | `dist/` decision | install commands | `dist/` を root に残すなら現 command を壊さない。移すなら全 install docs を更新する |

## Error Handling Approach

Application Design の error handling は runtime exception ではなく design gate と validation failure で扱う。各 candidate は guard impact を説明できなければ reject し、後続の Units Generation へ渡さない。
