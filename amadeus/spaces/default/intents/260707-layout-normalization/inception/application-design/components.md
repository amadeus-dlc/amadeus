# Components

## Upstream Trace

この設計は `requirements`、`architecture`、`component-inventory`、`team-practices` を上流根拠とする。`requirements` の FR-1 から FR-6、`architecture` の one-core-many-harnesses 構造、`component-inventory` の path sensitivity、`team-practices` の drift guard 重視を反映している。

## 推奨コンポーネント境界

| コンポーネント | 所有する責務 | Public interface | 境界判断 |
| --- | --- | --- | --- |
| Framework Source Zone | root `core/`, `harness/<name>/`, `scripts/manifest-types.ts` | harness manifest contract, source tree conventions | root-level に維持する |
| Packaging Tooling | `scripts/package.ts`, runner generation, harness emitters | `bun scripts/package.ts [<harness>] [--check]` | root-level に維持する |
| Self-Promotion Tooling | `scripts/promote-self.ts` | `bun scripts/promote-self.ts [--check|--apply]` | root-level runtime target と結合して維持する |
| Distribution Output | root `dist/<harness>/` | README/docs の install source, CI drift target | root-level public install contract として維持する |
| Runtime Dogfood Targets | root `.claude/`, `.codex/`, `.agents/` | repository self-install surface | package-owned layout へ移さない |
| Setup Package Boundary | future `packages/setup` | separate setup/install workflow | sibling intent dependency として分離する |
| Documentation Contract | `README.md`, `docs/guide/harnesses/*`, `docs/reference/11-contributing.md` | contributor/user mental model | root framework + package-owned setup の混在を明文化する |
| Validation Contract | `.github/workflows/ci.yml`, tests, fixtures | `dist:check`, `promote:self:check`, typecheck, lint, tests | layout decision の合否 gate として維持する |

## 採用する Layout Model

推奨 layout model は staged mixed layout である。framework source は root-level のまま維持し、`packages/setup` のような package-owned 領域は別 intent の sibling package として扱う。

```text
core/                     # framework source of truth
harness/<name>/            # harness-specific authored source
scripts/                   # repository-level packaging/self-promotion tooling
dist/<name>/               # public committed distribution output
.claude/.codex/.agents     # dogfood runtime install targets
packages/setup/            # sibling package, handled by separate intent
```

この model は full workspace normalization を恒久的に禁止しない。将来移行する場合は、先に source root abstraction を導入し、`dist/` relocation と directory move を別 slice に分ける。

## 非採用コンポーネント境界

`packages/amadeus/{core,harness,dist,scripts}` を現時点の推奨構造にはしない。理由は、`dist/` が generated output であるだけでなく public install source でもあり、self-promotion、tests、docs、CI drift guard まで同時に移動対象になるためである。
