# 技術スタック

## ランタイムと言語

変更なし。TypeScript(ESM)を Bun ランタイム上で直接実行する構成を維持している。`packages/setup` は functional-domain-modeling-ts スタイル(class-free、type + companion namespace、frozen literal factory、判別ユニオン Result)を全面採用している点も変更なし。

## 本 intent(bug-zero-batch)に関連する技術的な注記

- **#674**: `amadeus-swarm.ts` の `handleFinalize` は同期的な配列走査(`results[]`、`mergeFailures[]`)で状態を持つ素朴な手続き型実装であり、フレームワーク側の追加ライブラリは使っていない。修理は既存の2配列を1本化するか、merge-back フェーズの結果を `results[]` にフィードバックする再走査を追加するかの選択になる。
- **#675**: `amadeus-state.ts` は `withAuditLock` による再入可能ロックを持つが、guard 関数(`isAutonomousMode`/`humanPresenceGuardDisabled`/`humanActedSinceGate`)は `amadeus-lib.ts` からの純粋な import であり、`handleReject` に同じ import を追加するだけで技術的には配線可能(ただし team.md の要求どおり requirements-analysis で「reject にも同じガードを掛けるべきか」を意思決定してから実施する)。
- **#676・#668**: いずれも `amadeus-lib.ts` の record-dir/repo-name 解決系(`recordDir`、`spaceRecordRoot`、`intentRepos`、`basename`)に起因する。`node:path` の `basename` を worktree 対応にするには git 情報(`.git` ファイルの `commondir` 参照、または `git rev-parse --show-toplevel` 相当)を読む必要があり、現状この関数群に git 呼び出しは存在しない。
- **#677**: `packages/setup/src/ports/http.ts` は標準の `fetch`/`AbortSignal.timeout` のみに依存し、外部 HTTP ライブラリは使っていない。修理は `try/catch` の追加のみで、新規依存は不要。
- **#678**: `tar-archive-extractor.ts` は `node:zlib` の `createGunzip` によるストリーミング解凍と、自前実装の 512 バイトブロック単位パーサ(標準 tar ライブラリへの依存なし、意図的な設計方針としてコメントに明記: `tech-stack-decisions.md` 参照)で構成される。修理(あるいは実測による安全性確認)も自前パーサ内で完結する。

## ビルドとテストツール

変更なし。Bun(script runner/テスト実行)、TypeScript `^6.0.3`、Biome 2.4系、GitHub Actions(単一 ubuntu-latest job)、`bun:test` + 自作ランナー(smoke/unit/integration/e2e)。

## バージョンと依存関係の注記

`AMADEUS_VERSION` と `@amadeus-dlc/setup` パッケージバージョンの独立ライフサイクルは変更なし。バージョンバンプは `release.yml` の `workflow_dispatch` 一本に統一されている(project.md DECIDED 参照)。本 intent はこの仕組みに変更を加えない。
