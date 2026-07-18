# 技術スタック

## Codex hooks／agmsg runtime スタック（intent 260718-hooks-config-conflict、2026-07-18、最新）

- Amadeus 側は Bun／TypeScript の `emit.ts` が整形済み JSON template と trust seed を生成し、Codex は project 内の exact `.codex/hooks.json` を発見する。
- 外部 agmsg 1.1.7 は Bash driver と SQLite3 JSON1 (`readfile`／`writefile`、`json_set`／`json_remove`)で同じ active JSON を read-modify-write する。monitor bridge は Node.js と Codex `app-server --listen ws://` を利用する。
- 技術競合はライブラリバージョンではなく config ownership。pretty-print 化だけでは runtime entry と絶対 path の tracked diff が残る。
- active file の untrack／ignore、または static dispatcher + ignored sidecar はともに `【裁定待ち】`。新規技術導入の要否も採用案の裁定後に決める。

## multi-agent 実行スタック（intent 260713-swarm-driver-migration、2026-07-13、履歴）

| 実行面 | 現行技術 | プロセス境界 | 未解決の検証面 |
| --- | --- | --- | --- |
| Claude Code | live `Task`、Dynamic `Workflow` | live Claude session 内。現行 swarm は `claude -p` を起動しない | Agent Teams の team 実起動 event、Ultra Code workflow trace、各2 Unit以上 |
| Codex | `codex exec --skip-git-repo-check -C <worktree> ... < /dev/null` | Unit ごとの別 AI CLI process | `gpt-5.6-sol` Ultra の明示設定と native multi-agent委譲 event、各2 Unit以上 |
| Kiro CLI／IDE | live native `subagent` tool | live Kiro session 内。現行 swarm は `kiro-cli chat --no-interactive` を起動しない | subagent tool-call trace と最大並列／trust の事前検査 |
| Referee | Bun／TypeScript、Git、shell convergence command | AI worker とは独立した deterministic subprocess | requested／selected driver と native trace の correlation |
| Packaging | Bun `scripts/package.ts`、manifest、`scripts/promote-self.ts` | source→`dist`→Claude／Codex／Cursor／OpenCode self-install | 6 harness 配布と4 harness project-local self-install の drift |

基盤言語は TypeScript（ESM）、ランタイムと package manager は Bun、状態隔離と merge は Git、テストは `bun:test` と自作 runner を維持する。新 driver 契約のために cloud SDK／Responses API／永続 daemon を追加する計画はない。capability probe はローカル CLI／live tool の振る舞いを検査し、credential や provider 生レスポンスを保存しない。

live proof は決定的 unit／integration suite と分離した opt-in e2e とする。既存の Codex exec journey、Kiro ACP trace、Claude SDK／TUI journey は transport substrate として再利用可能だが、native driver を識別する classifier は新設が必要である。

> 以下は過去 intent の技術記録。導入予定と書かれた項目は当時の計画であり、今回 intent の current plan ではない。

## ランタイムと言語

変更なし。TypeScript(ESM)を Bun ランタイム上で直接実行する構成を維持している。`packages/setup` は functional-domain-modeling-ts スタイル(class-free、type + companion namespace、frozen literal factory、判別ユニオン Result)を全面採用している点も変更なし。

## テスト基盤の追加(intent 260710 区間、2026-07-10)

前回スキャン(162553b99)以降の38コミットで以下が加わった。#735 の packaging 検査を実装する際のテスト土台となる。

- **`fast-check ^4.9.0`(PBT、#722/#697 Phase B)**: property-based test を導入。`tests/helpers/arbitraries/{manifest,semver}.ts` に arbitrary を定義し、`tests/unit/setup-manifest.pbt.test.ts`・`setup-semver.pbt.test.ts`・`t204-audit-escape.pbt.test.ts` 等で manifest roundtrip / semver / audit escape の性質を検証。
- **動的 test-size 計測(#732/#699 Phase D)**: `tests/lib/test-size.ts` + `tests/run-tests.ts` がランナー実行中に各テストの size(pyramid 軸)を連続計測し `test-size-report.json` を出力。
- **codecov 導入**: `codecov.yml`(project/patch status)+ `.github/workflows/ci.yml` にカバレッジゲート(#687/#710)。`tests/.coverage-ratchet.json`・`.coverage-registry.json` を更新。

## 複雑度ゲート導入予定(intent 260710-complexity-gate、2026-07-10)

現行 HEAD からの diff-refresh(フォーカス5面)で確定した、複雑度ゲート導入(feature スコープ)が加える技術要素。詳細は code-quality-assessment.md「複雑度ゲート導入」節・initiative-brief 参照。

- **lizard 1.23.0(Python パッケージ、CI に pip 固定インストール予定)**: TS/多言語対応の CCN(cyclomatic complexity number)計測器。CI の `check` ジョブに typecheck/lint 直後のステップとして pip 固定バージョンで導入予定(E-CX1 Q3=A)。lizard 自体は純 Python 単一パッケージであり、最悪時は vendoring も選択肢(R3 代替緩和)。CCN の baseline ラチェット(現存 CCN>15 の42関数を grandfather、新規超過とラチェット悪化のみ赤)は、`tests/coverage-project-gate.ts` / `gen-coverage-registry.ts` と同型の「committed baseline JSON + env seam + --check 単調非減少 + --update 更新」テンプレートを踏襲する想定。
- **Biome `noExcessiveCognitiveComplexity` の有効化予定**: Biome 2.4系標準の cognitive-complexity ルールを warn として有効化予定(現状 `biome.json` の linter.rules では未有効)。あわせて lint スコープを現行の `tests/ packages/setup/` から `packages/framework/core` + `scripts` へ拡大予定(E-CX1 Q2=A、既存6指摘の機械的修正を同一 PR に含む)。2層ゲート(Biome warn + lizard CCN ラチェット)の warn 層を担う。



- **#685**: `amadeus-state.ts`/`amadeus-lib.ts`/`amadeus-audit.ts` はいずれも標準ライブラリ(`node:fs`、`node:path`)のみで構成される素朴な手続き型実装。#671 の `delegate-approval`/`humanActedSinceGate`/`verifyDelegatedApproval` と同型の機構(issuer coordinates を audit block に埋め込み、対象側が実 shard を読んで検証する)を REJECT 側に追加するのに新規の外部依存は不要。
- **#670**: `amadeus-worktree.ts` は `child_process`(`runGit`)経由で git を直接呼ぶ実装で、外部 git ライブラリへの依存はない。`assertNotSiblingWorktree` の分岐追加(許可すべき sibling とブロックすべき sibling の区別)も既存の `runGit` 呼び出しの範囲で完結する見込み。

## 260709-bug-zero-batch(旧 intent、履歴)に関連する技術的な注記

- **#674**: `amadeus-swarm.ts` の `handleFinalize` は同期的な配列走査(`results[]`、`mergeFailures[]`)で状態を持つ素朴な手続き型実装であり、フレームワーク側の追加ライブラリは使っていない。修理は既存の2配列を1本化するか、merge-back フェーズの結果を `results[]` にフィードバックする再走査を追加するかの選択になる。
- **#675**: `amadeus-state.ts` は `withAuditLock` による再入可能ロックを持つが、guard 関数(`isAutonomousMode`/`humanPresenceGuardDisabled`/`humanActedSinceGate`)は `amadeus-lib.ts` からの純粋な import であり、`handleReject` に同じ import を追加するだけで技術的には配線可能(ただし team.md の要求どおり requirements-analysis で「reject にも同じガードを掛けるべきか」を意思決定してから実施する)。
- **#676・#668**: いずれも `amadeus-lib.ts` の record-dir/repo-name 解決系(`recordDir`、`spaceRecordRoot`、`intentRepos`、`basename`)に起因する。`node:path` の `basename` を worktree 対応にするには git 情報(`.git` ファイルの `commondir` 参照、または `git rev-parse --show-toplevel` 相当)を読む必要があり、現状この関数群に git 呼び出しは存在しない。
- **#677**: `packages/setup/src/ports/http.ts` は標準の `fetch`/`AbortSignal.timeout` のみに依存し、外部 HTTP ライブラリは使っていない。修理は `try/catch` の追加のみで、新規依存は不要。
- **#678**: `tar-archive-extractor.ts` は `node:zlib` の `createGunzip` によるストリーミング解凍と、自前実装の 512 バイトブロック単位パーサ(標準 tar ライブラリへの依存なし、意図的な設計方針としてコメントに明記: `tech-stack-decisions.md` 参照)で構成される。修理(あるいは実測による安全性確認)も自前パーサ内で完結する。

## ビルドとテストツール

Bun(script runner/テスト実行)、TypeScript `^6.0.3`、Biome 2.4系、GitHub Actions(`ubuntu-latest`)、`bun:test` + 自作ランナー(smoke/unit/integration/e2e)。

- **fast-check `^4.9.0`(2026-07-09、`260709-pbt-small-band`/#697 の後に landed、`260709-dynamic-test-size` スキャンで確認)**: property-based testing ライブラリを `devDependencies` に追加(`package.json:32` 相当、`bun.lock` に対応エントリ)。PBT 用 arbitrary ヘルパー(`tests/helpers/arbitraries/semver.ts`)と PBT 単体テスト(`tests/unit/setup-semver.pbt.test.ts`)で使用。テスト専用依存であり production tree・配布物には非関与。test/coverage スクリプト(`test:ci`/`coverage:ci`/`test:all`)は無改変。

## バージョンと依存関係の注記

`AMADEUS_VERSION` と `@amadeus-dlc/setup` パッケージバージョンの独立ライフサイクルは変更なし。バージョンバンプは `release.yml` の `workflow_dispatch` 一本に統一されている(project.md DECIDED 参照)。一連の bugfix intent(バッチ D 含む)はこの仕組みに変更を加えない。
