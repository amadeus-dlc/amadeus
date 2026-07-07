# コード構造

## トップレベル構造

現在の checkout には `packages/` directory は存在しない。観測された主要構造は次の通り。

| パス | 役割 | レイアウト変更時の注意 |
| --- | --- | --- |
| `core/` | harness-neutral source of truth | `scripts/package.ts`, manifests, docs, tests が root `core/` 前提を持つ |
| `harness/claude/` | Claude 配布物 source | manifest が `coreDirs` と harness files を projection する |
| `harness/codex/` | Codex 配布物 source | `.codex`, `.agents/skills`, root `AGENTS.md` emit を含む |
| `harness/kiro/` | Kiro CLI 配布物 source | root `dist/kiro` install shape と docs が結合 |
| `harness/kiro-ide/` | Kiro IDE 配布物 source | `.kiro/specs` / `.kiro/steering` shape と結合 |
| `scripts/` | packaging, promote-self, runner generation | script location 自体が root layout assumption |
| `dist/` | commit 済み生成物 | install docs、tests、CI drift guard の anchor |
| `.claude/`, `.codex/`, `.agents/` | dogfood runtime install target | `promote-self` が preserve しながら更新 |
| `tests/` | unit/integration/e2e and harness fixtures | `dist/claude/.claude` など root path 参照が多い |
| `docs/`, `README.md` | contributor/user guide | root `core/harness/dist` model を説明 |
| `.github/workflows/` | CI | `dist:check` と `promote:self:check` が release/drift guard |

## ソース分類

`core/` と `harness/` は authored source、`dist/` は 生成済み but commit 済み 出力、`.claude/.codex/.agents` は repository 自身を使うための promoted runtime として扱われる。

この分類は package 境界より強い。たとえば `dist/` は 生成済み だが release artifact として repository に残るため、単純に package-local build 出力 として ignore することはできない。

## パス影響の棚卸し

| 領域 | 根拠 | 責務 | 移行リスク |
| --- | --- | --- | --- |
| Packager の root 定義 | `scripts/package.ts` の `REPO_ROOT`, `CORE_ROOT`, `HARNESS_ROOT` | build input contract | 高 |
| Packager の version import | `../core/tools/amadeus-version.ts` | script と core の相対位置 | 高 |
| Harness discovery | root `harness/<name>/manifest.ts` scan | harness list resolution | 中 |
| Projection contract | manifests の `coreDirs`, `harnessFiles` | source-to-dist mapping | 高 |
| Dist 出力 | root `dist/<name>` | commit 済み release 出力 | 高 |
| Compiled data seed | fallback `dist/claude/.claude` | bootstrap data source | 中 |
| Runner generation | assembled dist tree based generation | 生成 command | 中 |
| Check behavior | temp tree と root `dist/<name>` の byte diff | drift guard | 高 |
| Self-promotion | `dist/claude`, `dist/codex` から root runtime dirs へ反映 | dogfood install | 高 |
| Preservation rules | local settings と composed scopes | data-loss prevention | 高 |
| Manifest type model | `scripts/manifest-types.ts` の comments と types | projection API | 高 |
| Codex emitter | `.codex`, `.agents/skills`, root `AGENTS.md` | Codex install shape | 高 |
| README/docs | install と contributor examples | public contract | 高 |
| Test fixtures | `tests/harness/fixtures.ts`, `tui-fixtures.ts` | e2e install simulation | 非常に高 |
| Packaging tests | `t145`, `t150`, `t200` | guard proofs | 高 |
| Coverage/docs gates | coverage registry, legacy refs gate | derived metadata | 中 |

## 次工程へ持ち越すレイアウト候補

1. 現状維持: root-level framework source を維持し、`packages/setup` だけを別 package として扱う。
2. staged layout 継続: root framework は維持しつつ、new package 領域の naming と docs で MECE 性を補強する。
3. full workspace normalization: `packages/amadeus/{core,harness,dist,scripts}` などへ移す。ただし source root abstraction と compatibility period が必要。

次 stage では、この inventory を layout comparison と ADR/design record へ変換する。
