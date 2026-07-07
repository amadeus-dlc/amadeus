# コンポーネント棚卸し

## Core コンポーネント

| コンポーネント | 責務 | 依存先 | レイアウト感度 |
| --- | --- | --- | --- |
| `core/` | AI-DLC engine source, tools, templates, stage definitions | none as authored source | 高: root source assumption across scripts/manifests/docs |
| `core/tools/amadeus-version.ts` | version source used by packager | script relative import | 高: `scripts/package.ts` imports by relative root path |
| `core/templates/onboarding.md` | 配布物へコピーされる onboarding skeleton | packager `ONBOARDING_SKELETON` | 中 |
| `harness/<name>/manifest.ts` | harness ごとの source projection を宣言 | `scripts/manifest-types.ts`, root `core/`, root `harness/` | 高 |
| `harness/codex/emit.ts` | Codex 配布物の追加 emission | assembled dist tree, `coreRoot`, `harnessRoot` | 高 |

## ビルドと配布コンポーネント

| コンポーネント | 責務 | 依存先 | レイアウト感度 |
| --- | --- | --- | --- |
| `scripts/package.ts` | `dist/<name>` の生成と検査 | root `core/`, root `harness/`, root `dist/` | 非常に高 |
| `scripts/promote-self.ts` | dogfood self-install と drift check | root `dist/claude`, root `dist/codex`, root runtime dirs | 非常に高 |
| `scripts/manifest-types.ts` | manifest schema と projection semantics | root naming model | 高 |
| runner generation | package build 中に command runner を生成 | assembled dist tree | 中 |
| `dist/<name>/` | commit 済み生成配布物 | packager, docs, tests, CI | 非常に高 |

## Runtime と dogfood コンポーネント

| コンポーネント | 責務 | 依存先 | レイアウト感度 |
| --- | --- | --- | --- |
| `.claude/` | この repo の Claude runtime install target | `promote-self` | 高 |
| `.codex/` | この repo の Codex runtime install target | `promote-self`, composed scope preservation | 高 |
| `.agents/` | Codex skills/runtime install target | `dist/codex/.agents` | 高 |
| `amadeus/spaces/default/` | local Amadeus record/artifact store | generated tools と current intent | 中 |

## 品質コンポーネント

| コンポーネント | 責務 | 依存先 | レイアウト感度 |
| --- | --- | --- | --- |
| `.github/workflows/ci.yml` | CI drift check と validation | root package scripts | 高 |
| `tests/harness/fixtures.ts` | shared e2e install fixture helper | root `dist/claude/.claude`, root `dist/*` | 非常に高 |
| `tests/harness/tui-fixtures.ts` | TUI harness fixture copy helper | root `dist/claude`, `dist/kiro`, `dist/kiro-ide` | 高 |
| `tests/integration/t145-packaging-parity.test.ts` | package drift guard を検証 | root `scripts/package.ts` | 高 |
| `tests/unit/t150-codex-packaging.test.ts` | Codex 配布物 shape を検証 | root `dist/claude`, root `dist/codex` | 高 |
| `tests/unit/t200-promote-self-composed-scope.test.ts` | self-promotion preservation を検証 | root `scripts/promote-self.ts`, root runtime dirs | 高 |
| `tests/gen-coverage-registry.ts` | coverage metadata generation | root `dist/claude/.claude` labels | 中 |

## ドキュメントコンポーネント

| コンポーネント | 責務 | 依存先 | レイアウト感度 |
| --- | --- | --- | --- |
| `README.md` | public install と contributor model | root `core/harness/dist` | 高 |
| `docs/guide/harnesses/*.md` | harness-specific install/regenerate instructions | root `dist/*`, root `core + harness` | 高 |
| `docs/reference/11-contributing.md` | maintainer workflow | root `core/`, `harness/<name>/`, `dist/` | 高 |
| docs legacy refs gate | stale reference を防ぐ | docs + root `core/templates` + harness skills | 中 |

## 外部 sibling コンポーネント

`packages/setup` is intentionally not inventoried as a local component because `packages/` is absent in this checkout. For this intent it is a sibling dependency and parallel intent. It can influence layout comparison, but should not be treated as existing ファイルシステム evidence.
