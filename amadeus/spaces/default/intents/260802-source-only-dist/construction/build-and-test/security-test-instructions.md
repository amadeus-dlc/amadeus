# セキュリティテスト手順

## 上流参照と脅威境界

全9 Unit の `code-generation-plan.md`、`code-summary.md`、各Unitのsecurity designを入力とする。主な脅威は、改竄されたrelease asset、path traversal、不正redirect、生成投影の追跡復活、allowlistの過剰許可、hook実体の欠落、設定・文書による誤誘導である。

## 実行方法

- 静的検査: `bun run typecheck && bun run lint`
- source-only追跡境界: `bun run source-only:check`
- 配布完全性: `bun run distribution:check`
- セキュリティ境界を含む全fixtureテスト: `bun run test:ci`

テストではSHA-256 checksum、manifest、HTTPS redirect host、archive path traversal、symlink/no-follow、atomic write、fail-closed parsing、hook trust、permission allowlistを検査する。対象にHTTPサービスやブラウザUIがないためDASTは非該当である。

## 合格基準と制約

- 不正なasset、manifest、path、redirect、allowlist、hook状態を受理しない
- GitHub App tokenはrelease公開jobにのみ残し、通常build/testへ権限を広げない
- 個人認証情報を成果物、ログ、fixtureへ含めない
- live AWS/Claude substrateがない環境のskipは記録し、ローカルfixtureとGitHub CIの必須checkで代替境界を検証する
