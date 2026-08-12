# コード構造

## Repository Organization

| パス | 分類 | 責務 |
|---|---|---|
| `packages/framework/core/` | 正本 core | stage graph、orchestration、state/audit、protocol、sensor、共通知識 |
| `packages/framework/harness/<name>/` | host adapter | claude、codex、cursor、kimi、kiro、kiro-ide、opencode、pi 向け投影 |
| `plugins/pr-convergence/` | plugin bundle | stage、sensor、GitHub adapter、predicate、ledger、CLI |
| `scripts/` | build/distribution | `dist/<harness>/` 生成、self promotion、distribution verification |
| `tests/` | verification | smoke、unit、integration、e2e、conformance、formal-verif、fixtures |
| `amadeus/spaces/` | workflow records | Intent state、audit、stage artifacts、共有 CodeKB |
| `.codex/` など | self-install surface | harness ごとのローカル生成・bootstrap 面 |

## Focus Area: PR Convergence

| ファイル | 主な要素 |
|---|---|
| `amadeus/config.json` | plugin activation と4 self-* scope binding |
| `plugins/pr-convergence/plugin.json` | stage bundle、code-generation produces seam、tool inventory |
| `plugins/pr-convergence/stages/pr-convergence.md` | convergence loop と手動 sensor fire の運用契約 |
| `plugins/pr-convergence/tools/pr-convergence-cli.ts` | `create/status/report/override` dispatcher、report renderer/writer |
| `plugins/pr-convergence/tools/pr-convergence-gh-runner.ts` | `gh` process adapter、GraphQL snapshot parser |
| `plugins/pr-convergence/tools/pr-convergence-predicate.ts` | merge/lifecycle/convergence の純粋判定 |
| `plugins/pr-convergence/tools/pr-convergence-ledger.ts` | paged review thread の分類と集計 |
| `plugins/pr-convergence/tools/pr-convergence-provenance.ts` | PR title/body の Intent/Bolt/Unit provenance 検証 |
| `plugins/pr-convergence/tools/pr-convergence-presentation.ts` | canonical PR title/body の生成 |
| `plugins/pr-convergence/tools/amadeus-sensor-pr-convergence-report-format.ts` | report shape の独立 parser |
| `plugins/pr-convergence/sensors/amadeus-pr-convergence-report-format.md` | advisory sensor manifest |
| `packages/framework/core/tools/amadeus-graph.ts` | plugin scope binding の additive overlay |
| `packages/framework/core/tools/amadeus-plugin.ts` | plugin compose/drop と stage seam materialization |
| `packages/framework/core/tools/amadeus-orchestrate.ts` | per-unit required artifact coverage と approval routing |
| `packages/framework/core/tools/amadeus-state.ts` | direct completion chokepoint、artifact/sensor guard |

## Code Patterns

- TypeScript ESM、Bun 直接実行。
- external process は shell 文字列ではなく argv 配列で spawn する。
- I/O adapter と純粋判定を分離し、テストでは seams を injection する。
- CLI は discriminated union の outcome と固定 exit code を返す。
- stage metadata は Markdown frontmatter、scope plan は compiled JSON、plugin contribution は additive seam で表す。
- generated `dist/` と self-install tree は source of truth ではなく disposable output とする。

## Change Surface for Issue #2838

必須変更は単一ファイルに閉じない。

1. plugin report schema/writer に attestation を追加する。
2. attestation の検証 owner を sensor または core completion boundary に設ける。
3. sensor manifest/stage wiring を blocking にする。
4. `create` 前提検査を Git adapter と CLI に追加する。
5. direct state artifact guard を required-all semantics へ揃える。
6. scope/harness/compose/drop/resume/completion を横断する integration tests を追加する。

既存の core/plugin 非依存方向を守るには、core が plugin-specific Markdown schema を直接 import するのではなく、plugin が発行した汎用 receipt を core の既存 audit/artifact contract で検証する形が最も境界整合的である。これは設計候補であり、最終決定は後続 stage の所掌とする。
