# Upstream 仕様書: awslabs/aidlc-workflows (v2)

> **Source**: [awslabs/aidlc-workflows](https://github.com/awslabs/aidlc-workflows/tree/3c3146cfd7cef33020d48e8d48d4e80d0f8c2820) — branch `v2`, commit `3c3146cf`(v2.6.40、2026-08-21 取得)
> **Status**: 上流実装から導出した as-built 仕様。本文書より上流コードが常に優先される。
> **正本**: 英語版 `README.md`(この日本語版は参照訳。両者が食い違う場合は英語版が優先)

このディレクトリは、上流 AI-DLC Workflows 2.0 フレームワークの as-built 仕様書を収める。`v2` ブランチの実装(`core/`、`harness/`、`scripts/`、`tests/`、`plugins/`)を読んで起草した。各文書には日本語の参照訳(`*.ja.md`)が併記され、英語版が正本である。

## 読む順序

| # | 文書 | 主題 |
| --- | ------ | ------ |
| 00 | [00-overview.md](00-overview.md) ([訳](00-overview.ja.md)) | リポジトリの目的、トップレベル構成、core→dist の正本モデル、バージョニング、開発ツール |
| 01 | [01-workflow-model.md](01-workflow-model.md) ([訳](01-workflow-model.ja.md)) | フェーズ、全ステージ一覧、スコープ(EXECUTE/SKIP グリッド)、depth と test-strategy のティア、ステージグラフのコンパイル、composer |
| 02 | [02-orchestration-engine.md](02-orchestration-engine.md) ([訳](02-orchestration-engine.ja.md)) | エンジンループ(`next`/`report`)、directive プロトコル、ゲート、jump/park/resume、single-stage モード、conductor 契約 |
| 03 | [03-state-audit-runtime.md](03-state-audit-runtime.md) ([訳](03-state-audit-runtime.ja.md)) | ワークスペース構成(spaces/intents)、state ファイル契約、監査イベントシステム、ランタイムのパス解決と introspection |
| 04 | [04-stage-protocol.md](04-stage-protocol.md) ([訳](04-stage-protocol.ja.md)) | ステージファイルの構造、基本ステージプロトコル、プロトコル変種(construction、swarm、ensemble、governance、recovery、reviewer) |
| 05 | [05-agents.md](05-agents.md) ([訳](05-agents.ja.md)) | 14 のエージェントペルソナ、レビュアーの read-only 契約、composer エージェント、エージェント別ナレッジの結び付け |
| 06 | [06-sensors.md](06-sensors.md) ([訳](06-sensors.ja.md)) | センサーマニフェスト、ディスパッチ、blocking 意味論、同梱 6 センサー |
| 07 | [07-hooks.md](07-hooks.md) ([訳](07-hooks.ja.md)) | 17 のコアフック: セッションライフサイクル、ガード、state 同期、usage 集約、statusline |
| 08 | [08-memory-rules-learnings.md](08-memory-rules-learnings.md) ([訳](08-memory-rules-learnings.ja.md)) | 階層メモリ/ルール(org→team→project→phase→stage)、learnings 受理ゲート、steering、チームナレッジ |
| 09 | [09-cli-tools.md](09-cli-tools.md) ([訳](09-cli-tools.ja.md)) | CLI ツール一覧: bolt の autonomy、swarm 収束、worktree 管理、testing posture、usage/コスト、doctor 群 |
| 10 | [10-distribution-harnesses.md](10-distribution-harnesses.md) ([訳](10-distribution-harnesses.ja.md)) | パッケージングパイプライン(`scripts/package.ts`)、ハーネスのマニフェスト/アダプタ、8 つの dist ターゲット、self-install と sync |
| 11 | [11-plugin-system.md](11-plugin-system.md) ([訳](11-plugin-system.ja.md)) | プラグインの構造、contribution のマージ、activation、同梱例 `test-pro` |
| 12 | [12-testing-ci.md](12-testing-ci.md) ([訳](12-testing-ci.ja.md)) | 4 層テストスイート、ランナー契約、coverage registry、e2e ハーネス、CI と docs ワークフロー |

## 出自

- `https://github.com/awslabs/aidlc-workflows` の `v2` ブランチをコミット `3c3146cfd7cef33020d48e8d48d4e80d0f8c2820` で取得(2026-08-21 に `git ls-remote refs/heads/v2` と一致を確認)。
- 当該コミット時点のフレームワークバージョン: **2.6.40**(上流 `CHANGELOG.md` 先頭エントリ)。
- 各文書は `## Measurement notes` 節に全カウントの取得コマンドを記録しており、同一コミットに対して数値を再導出できる。
