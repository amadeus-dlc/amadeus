# Amadeus ビジネス概要

## TLA+ model authoring の業務境界（260804-tla-authoring、現在、observed `7172aea8d`）

- **目的**: [Issue #2161](https://github.com/amadeus-dlc/amadeus/issues/2161) は、現在の要求・設計から形式検証の適用可否を判断し、必要ならモデルを新規作成または改訂して、proof・review・登録を経て既存 `formal-model-check` へ渡す監査可能な価値鎖を成立させる `self-feature` である。既存モデルの無関係な `NOT_DETECTED` だけでは完了できないことが利用者価値の中心である。
- **現行能力**: model-map v2、2登録モデル、source/implementation drift、`--impl-only`、TLC完全探索、selected-model receipt、advisory相関、falling/vacuity/reductionの手順と実例は再利用できる。
- **現行の断線**: core 32 stage + plugin 1 stageの全33 stageに、要求・設計を入力として `.tla` / `.cfg` / reduction / trace / `model-map.json` の新規作成・改訂を完了条件まで所有する実行可能ownerは0件。実在する `formal-model-check` は `consumes: []` / `produces: []` / `requires_stage: []` / `scopes: []` の登録済みモデル実行専用である。
- **Must境界**: scope M1〜M8は、適用判定、新規authoring、意味変更時の改訂、`--impl-only`、非対象receipt、全数trace、staleness、proof/review、未知題材E2E、既存2モデル互換を一つの鎖として要求する。新規stageか既存stage overlayかは本scanでは確定せず、Requirements Analysis / Application Designへ送る。
- **`BLOCKER`候補**: plugin manifestが `tla-model-receipt.ts` と `tla-module-deps.ts` を登録していない。canonical source直実行のfresh focused suiteは44 pass / 168 expectでも、composed Codexの `run-model-check.ts --help` は最初のmissing importでexit 1になる。M7のexecutor handoffとM8の全harness互換に直接抵触するため、Requirements Analysisで「同Intent内修復」または「hard dependency付き別Issue」を裁定する。修復を伴わない完了は現行Must outcomesと矛盾する。
- **非拡張境界**: TLC実行器の全面再実装、全変更へのTLA+強制、LLM生成自体の決定論化、既存2モデルのverdict identity変更は含めない。

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
