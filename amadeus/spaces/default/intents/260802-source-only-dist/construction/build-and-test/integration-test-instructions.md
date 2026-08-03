# Integrationテスト手順

## 上流参照と境界

全9 Unit の `code-generation-plan.md` と `code-summary.md` を入力に、Unit間と外部境界を検査する。重点は、正規ソースから配布物を生成し、release assetをinstallerが取得・検証・展開できる一連の流れである。

## 実行方法

- 統合を含むCI構成: `bun run test:ci`
- 配布契約: `bun run distribution:check`
- source-only境界: `bun run source-only:check`
- 特定integration: `bun test --timeout 120000 tests/integration/<file>.test.ts`

外部GitHub、AWS、Claude CLIを必要とするliveテストは、認証またはsubstrateがない環境ではskipされる。release asset、HTTP redirect、checksum、installer filesystem、hook dispatch、worktree、migrationはfake networkまたは一時Git repositoryで決定的に検証する。

## 合格基準

- source-only checkoutからbuild、distribution、installerの境界が連続して成功する
- 追跡対象外の生成投影を前提とせず、必要な時点で再生成できる
- checksum、manifest、allowlist、graph、公開projectionの不整合がfail-closedで検出される
- 並列負荷によるtimeoutは隔離再実行で失敗0となる
