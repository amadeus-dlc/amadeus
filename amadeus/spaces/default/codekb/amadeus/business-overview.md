# Amadeus ビジネス概要

## 観測メタデータ

- 観測日: 2026-08-04
- Base commit: `9458bbda85eb7257310a80882b4858dc6ce3d1fc`
- Observed commit: `499d706a25f3cc2cc0c2b1671dc4b282e3a818e1`
- Repository: `amadeus`（Brownfield、Bun/TypeScript monorepo）
- Phase 2 focus: Kimi Code print driver と Kiro CLI ACP/TUI を既存の common live E2E policy/lifecycle へ接続するための現状調査。

## プロダクトの目的

Amadeus は AI 支援開発を、Intent、フェーズ、ステージ、承認ゲート、監査証跡、配布可能な複数ハーネスとして運用する CLI フレームワークである。正本は `packages/framework/core/` と `packages/framework/harness/<name>/` にあり、`scripts/package.ts` が各ハーネスの配布ツリーを生成し、`packages/setup/` が利用者プロジェクトへ導入する。

主要な利用者は、AI-DLC を実行する開発者、ステージ成果物を承認する責任者、ハーネス配布面を保守する開発者である。永続的な業務記録は `amadeus/spaces/<space>/` の Intent、memory、codekb、audit に置かれる。

## 現在の主要能力

- 32ステージの適応型ライフサイクルとスコープ別実行計画: `packages/framework/core/amadeus-common/stages/`、`packages/framework/core/tools/amadeus-orchestrate.ts`。
- Intent、状態、監査、選挙、swarm、mirror、plugin、sensor の短命 CLI 群: `packages/framework/core/tools/`。
- Claude、Codex、Cursor、OpenCode、Kiro CLI、Kiro IDE、Kimi Code、Pi の8ハーネス配布定義: `packages/framework/harness/` と `packages/setup/src/domain/harness.ts`。
- ローカル生成物の再現可能な構築と self-install 投影: `scripts/package.ts`、`scripts/promote-self.ts`。
- Bun ベースの smoke/unit/integration/e2e/perf/formal-verif 検証: `tests/`、`tests/run-tests.ts`。

## Phase 2 の業務境界

Observed HEAD では共通 live E2E kernel が `tests/harness/live-e2e/` に存在し、Codex exec と Claude print/SDK/TUI の4 adapterだけを registry に登録している。Kimi と Kiro の従来 live journey は実在するが、共通の機械可読 outcome、GitHub Actions hard deny、環境 allowlist、cleanup barrier、JSONL ledger、capability matrix には未接続である。

Phase 2 の顧客価値は、Kimi/Kiro のCLI固有差を adapter に閉じ込めつつ、課金を伴う実モデル実行が明示 opt-in のときだけ起動し、認証・設定を漏らさず、skip・timeout・failure・success を同じ分類で再実行可能にすることである。Kiro IDE GUI/CDP、Cursor、OpenCode はこのIntentの対象外である。

## 成功と未確定事項

Kimi の接続候補は `tests/harness/kimi-print-drive.ts` の `kimi -p`、一時 `KIMI_CODE_HOME`、credential symlink、managed provider config を共通 `LiveAdapter` へ適合させる seam である。現行 driver は child env を `process.env` から再展開するため、共通 `buildChildEnvironment` による allowlist 化が必要である。

Kiro は ACP と TUI の両経路が既に実走テストを持つ。ACP は構造化 tool update と deterministic cancel anchor を得られる一方、`Bun.spawn` の child env と設定homeが未隔離である。TUI は painted pane とdisk stateを観測できる一方、tmux shellがambient env/homeを継承する。どちらを直接接続するか、または阻害要因付き後続Issueへ送るかは後続設計で確定する。
