# Build Instructions — plugin-optin-parity

本手順は `construction/plugin-optin-parity/code-generation/code-generation-plan.md` と `code-summary.md` を上流入力とする。

## 前提と環境

- Bun 1.3.13、TypeScript 6.0系を使用する。常駐service、database、外部model providerは不要。
- repository rootで `bun install --frozen-lockfile` を実行し、lockfileと依存関係を一致させる。
- machine-localな `.codex/.amadeus-plugin-*`、`.codex/.amadeus-plugin-src/`、`.codex/plugins/`、`.codex/skills/` はbuild入力・commit対象にしない。
- 認証情報や追加の環境変数は不要。live SDK/substrate testは正規CI runnerのskip契約に従う。

## Buildと生成物検証

```bash
bun run typecheck
bun run lint
bun scripts/package.ts --check
bun run promote:self:check
bun run distribution:check
```

合格条件は全コマンドexit 0、型エラー0、lintの新規error 0、7 harnessのpackage/promotion/distribution drift 0である。lintの既存warningは件数を記録し、新規退行と混同しない。

## トラブルシュート

- `bun` が見つからない場合はworkspaceのmise/Bun runtimeを確認する。
- package/promote drift時は正本を修正し、`bun scripts/package.ts` と `bun run promote:self` で再生成する。`dist/`を手編集しない。
- coverage registry drift時は `bun tests/gen-coverage-registry.ts` を実行し、生成差分と新規test分類を確認する。
- cold compileで既知の重いintegrationがtimeoutした場合は、失敗ファイルだけを `bun test --timeout 120000 <path>` で再実行し、機能失敗と環境timeoutを分離する。
