# Amadeus 技術スタック

## TLA+ authoring調査時の技術断面（260804-tla-authoring、現在、observed `7172aea8d`）

| 技術 | version / 用途 |
| --- | --- |
| Bun | 1.3.13。workspace、CLI、`bun:test`、build orchestration |
| TypeScript | `^6.0.3`、ES modules、strict / noEmit |
| Biome | 2.5.5。lint、cognitive complexity >15はwarning |
| fast-check | `^4.9.0`。property-based tests |
| TLC artifact | 1.7.4をSHA-256固定取得。出力parserはTLC2 2.19契約 |
| OpenJDK | 26.0.1。local TLC runtime |
| Docker fallback | digest-pinned `eclipse-temurin:26-jdk` |
| GitHub | Issues / PR / Projects / Actions / release assets |

HTTP service、database、long-running serverはなく、authoring機能も既存の短命CLI・Markdown stage・JSON receipt境界へ統合する前提で評価する。新規外部runtime依存はIssue #2161の成立条件ではない。

rebase後区間では設定参照がstructured configへ移行したが、formal activation/advisory、plugin projection、TLC runtimeの技術選択と意味論は変わっていない。

## 観測メタデータ

- 観測日: 2026-08-04
- Base commit: `9458bbda85eb7257310a80882b4858dc6ce3d1fc`
- Observed commit: `499d706a25f3cc2cc0c2b1671dc4b282e3a818e1`
- ローカル実測: Bun `1.3.13`、Kimi CLI `0.31.1`、Kiro CLI `2.13.0`。

## 言語・ランタイム・ビルド

| 技術 | Version/constraint | Evidence | 用途 |
|---|---|---|---|
| TypeScript | `^6.0.3` | root `package.json` | core/setup/scripts/tests |
| Bun | `1.3.13`運用、setup engine `>=1.3.13` | environment、`packages/setup/package.json` | runtime/package manager/test/build |
| ESM | `type: module` | root/package manifests | module system |
| Biome | `2.5.5` | root `package.json` | lint（formatter無効方針） |
| Bun test | Bun同梱 | `tests/run-tests.ts` | smoke/unit/integration/e2e |

## 主要開発依存

| Dependency | Version | 用途 |
|---|---:|---|
| `@anthropic-ai/claude-agent-sdk` | `0.3.158` | Claude SDK live adapter |
| `@ast-grep/napi` | `0.45.0` | 静的検査/gate |
| `@opentelemetry/api` | `1.9.1` | telemetry API |
| `@opentelemetry/api-logs` | `0.221.0` | logs API |
| `@opentelemetry/context-async-hooks` | `2.10.0` | async context |
| `fast-check` | `^4.9.0` | property-based tests |
| `release-it` | `^20.2.1` | release/tag/npm publish |

## 外部CLI・OS機能

- Git/GitHub CLI: diff、worktree、PR/release連携。
- tmux: Claude/Kiro TUI live journey。`tests/harness/tui-drive.ts` がprivate serverを操作する。
- Kimi Code CLI: Observed環境 `0.31.1`。既存doc floorは`0.29.0`、print modeは`kimi -p`。
- Kiro CLI: Observed環境 `2.13.0`。既存distribution prerequisiteは`>=2.6`、ACPは`kiro-cli acp`、TUIは`kiro-cli chat`。
- SQLite: `bun:sqlite` をKiro IDE seed等で使用するが、常駐DBは持たない。
- macOS/Linux中心。TUIはtmux依存、Kiro IDE driverはmacOS Electron依存でPhase 2対象外。

## 配布技術

manifest-driven buildは `scripts/manifest-types.ts` と `scripts/package.ts`、installerは `@amadeus-dlc/setup` `0.1.7`。生成 `dist/` とself-install面は未追跡ローカル出力で、Git境界は `bun run source-only:check` が検査する。releaseはGitHub Actions `release.yml` とrelease-itで行う。

## Live E2E 技術

common kernelは外部frameworkを追加せず、TypeScriptのport/adapter、`AbortController`、child process、filesystem lock/atomic JSONL、SHA-256 digestで構成される。Kiro ACPはnewline-delimited JSON-RPC、Kiro TUIはtmux painted pane、Kimiは同期`spawnSync` print modeを利用する。

Phase 2では新規library導入は不要と観測される。既存portとNode/Bun標準APIで接続できるが、Kiro auth/config隔離の実現可能性はruntime probeで確定が必要である。
