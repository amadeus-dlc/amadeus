# Unitテスト手順

## 上流参照と対象

全9 Unit の `code-generation-plan.md` と `code-summary.md` を入力に、要件、境界条件、fail-closed契約、再現性を検証する。テスト戦略は Comprehensive であるが、件数を目的化せず、各要件と高リスク境界を直接検査する。

主な対象はrelease asset生成、installer、scope promotion、hook dispatcher、agent import、allowlist、CI順序、source-only境界、文書規範である。

## 実行方法

- 全CIテスト: `bun run test:ci`
- 単一ファイル: `bun test <test-file>`
- 重いファイルの隔離再実行: `bun test --timeout 120000 <test-file>`
- 型検査: `bun run typecheck`

テストはBun testとリポジトリ固有の `tests/run-tests.ts` harnessを使用する。fixtureは各テストの一時ディレクトリに作成し、実行順、共有状態、ネットワークの成否へ依存させない。

## 合格基準とデータ管理

- ローカルで実行可能なunit/smokeテストは失敗0
- source-only checkoutから生成した投影を使うテストも失敗0
- timeoutは高い上限での隔離再実行でも再現した場合のみ機能失敗とする
- live providerや期限切れAWS認証だけに依存するテストは明示的skipとし、fixtureベースの同等境界検査を必須とする

固定fixture、property-based test、golden vectorを使用し、秘密情報や実ユーザーデータは使用しない。
