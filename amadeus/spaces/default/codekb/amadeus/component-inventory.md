# Amadeus コンポーネント目録

## TLA+ authoring関連コンポーネント（260804-tla-authoring、現在、observed `7172aea8d`）

| コンポーネント | 状態 | 責務 / 欠落 |
| --- | --- | --- |
| Requirements / Design成果物 | 既存 | 現在要求と設計identityを保持するがformal適用判定へ未配線 |
| plugin activation / advisory | 既存 | `specs/tla/**` hashを通知。要求意味の判定やauthoring起動はしない |
| model-map v2 / completeness sensor | 既存 | 2モデルのsource/impl identity、aux、vocabulary、`--impl-only`を扱う |
| formal model authoring owner | **欠落** | author / revise / non-target / trace / proof / review / registrationを所有する実行可能componentがない |
| `formal-model-check` executor | 既存 | 登録済みモデルのTLC実行、verdict normalization、artifact/receipt検証 |
| `tla-model-receipt.ts` | canonicalに存在、composedに欠落 | selected-model verified receipt。manifest未登録 |
| `tla-module-deps.ts` | canonicalに存在、composedに欠落 | TLA補助module依存閉包。manifest未登録 |
| plugin import-closure guard | **欠落** | manifestの全toolから静的/実行時import閉包が配布対象に含まれることを検査しない |

missing 2 componentsの扱いは区別する。authoring ownerはIssue #2161が追加する新能力、import-closure guardは既存M7/M8基盤の欠陥候補である。後者を無断でscope追加せず、Requirements Analysisの裁定対象とする。

## 観測メタデータ

- 観測日: 2026-08-04
- Base commit: `9458bbda85eb7257310a80882b4858dc6ce3d1fc`
- Observed commit: `499d706a25f3cc2cc0c2b1671dc4b282e3a818e1`
- HealthはObserved HEADの構造と対象テストの実在に基づく定性評価であり、Phase 2 live実走結果ではない。

## 中核コンポーネント

| Component | Path | 責務 | 主依存 | Health |
|---|---|---|---|---|
| Orchestration engine | `packages/framework/core/tools/amadeus-orchestrate.ts` | directive routing、gate、stage/swarm進行 | state/lib/graph/audit | at-risk（高結合・大規模） |
| State/audit | `packages/framework/core/tools/amadeus-{state,lib,audit,journal}.ts` | 永続状態、lock、append-only audit | filesystem/git | at-risk（整合性リスクが高い） |
| Stage graph/schema | `amadeus-graph.ts`、`amadeus-stage-schema.ts` | stage/scopesのcompile/validation | stage markdown | healthy |
| Setup package | `packages/setup/src/` | fetch、plan、transaction、report | GitHub Release/filesystem | healthy |
| Distribution builder | `scripts/package.ts` | manifest-driven deterministic build | manifests/core sources | healthy |
| Self promotion | `scripts/promote-self.ts` | dogfood生成面同期 | dist/setup Kimi hooks | healthy |
| Harness adapters | `packages/framework/harness/*` | native hooks/settings/agents/skills | core projection | healthy |
| OTel layer | `packages/framework/core/otel/` | local traces/metrics/logs、redaction | vendored/API packages | healthy |

## Live E2E コンポーネント

| Component | Path | 責務 | Phase 2評価 |
|---|---|---|---|
| Contract/taxonomy | `tests/harness/live-e2e/contract.ts` | canonical status/code、sanitize/digest | 再利用可能 |
| Policy | `tests/harness/live-e2e/policy.ts` | CI hard deny、exact opt-in、env allowlist | 再利用必須 |
| Lifecycle | `tests/harness/live-e2e/lifecycle.ts` | 実行順序、timeout、cleanup barrier、ledger | 再利用必須 |
| Registry/matrix | `registry.ts`、`projector.ts`、`project-matrix.ts` | capability正本と文書投影 | Kimi/Kiro行が未登録 |
| Ledger/resources | `ledger.ts`、`resources.ts` | durable receipt、cleanup state | Kimi symlink/Kiro process登録が必要 |
| Codex adapter | `tests/harness/live-e2e/codex.ts` | exec/json/credential lease | 参照実装 |
| Claude adapters | `claude.ts`、`claude-sdk.ts`、`claude-tui.ts` | print/SDK/TUI固有実装 | Kiro ACP/TUIの参照実装 |

## Kimiコンポーネント

| Component | Path | 現状 |
|---|---|---|
| Distribution manifest | `packages/framework/harness/kimi/manifest.ts` | `.kimi-code`、hook snippet、adapter/lib、skills/agentsを配布 |
| Hook adapter/runtime | `packages/framework/harness/kimi/hooks/` | user-level configからproject adapterへrouting |
| Setup hook merge | `packages/setup/src/modules/kimi-hooks.ts` | marker-fenced managed blockをuser configへ適用 |
| Legacy print driver | `tests/harness/kimi-print-drive.ts` | `kimi -p`、scratch config、credential symlink。common lifecycle未接続 |
| Legacy journeys | `tests/e2e/t-print-kimi-*.serial.test.ts` | status/doctorを実CLIで検証。canonical ledgerなし |

## Kiro CLIコンポーネント

| Component | Path | 現状 |
|---|---|---|
| Distribution manifest | `packages/framework/harness/kiro/manifest.ts` | `.kiro`、agent JSON、settings、hook runtimeを配布 |
| ACP driver | `tests/harness/kiro-acp-drive.ts` | JSON-RPC、tool anchor、cancelを実装。env/home隔離なし |
| TUI driver | `tests/harness/tui-drive.ts` | tmux start/send/capture/kill。ambient shell envを継承 |
| ACP journeys | `tests/e2e/t-acp-kiro-*.serial.test.ts` | status/jump/compose/reviewer/workspace等のlive実績 |
| TUI journeys | `tests/e2e/t-tui-kiro-*.serial.test.ts` | status/intent-capture/fix scope等のlive実績 |
| IDE driver（対象外） | `tests/harness/kiro-ide-driver.ts` | Electron/CDP。Phase 2へ混在させない |

## 配布面とテスト面

Kimi/Kiroはpackagerとsetupのsupported harness集合に含まれ、dist生成は現行で成立する。Phase 2の不足は配布物そのものではなく、実CLI検証を共通安全契約へ接続するadapter/contract層である。`tests/harness/live-e2e/runs.jsonl` はObserved時点で0行のため、共通kernel上の永続green receiptはまだ存在しない。
