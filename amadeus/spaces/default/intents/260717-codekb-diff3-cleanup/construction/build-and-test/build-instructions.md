# Build Instructions — CodeKB hygiene verification handoff

## 入力と前提

本手順は`code-generation-plan.md`のno-op application実装方針と、`code-summary.md`のapplication / test / configuration / dependency変更0件を入力とする。Bun、Git、workspace dependency substrateを既存のまま使い、新しいenvironment variable、credential、local service、AWS resourceを要求しない。

- BunとGitが`PATH`上に存在すること。
- `node_modules/.bin/tsc`が実行可能であること。
- `package.json`と`bun.lock`を変更しないこと。
- 無関係な既存dirty fileをbuild対象やcommit対象へ取り込まないこと。

## Build commands

workspace rootで次を順番に実行する。

1. `bun run typecheck`
2. `bun run lint`
3. `bun tests/complexity-gate.ts --check`
4. `bun run dist:check`
5. `bun run promote:self:check`

本unitはcompile / bundle / transpile対象となる新規application codeを持たないため、typecheckとdistribution drift検査をbuild verificationとする。すべてexit 0であることを要求し、既存warningはblocking errorと分離して記録する。

## Build verificationとtroubleshooting

`code-summary.md`に記録された直前baselineと、fresh実行のexit code、対象件数、drift件数を比較する。`tsc: command not found`なら実装失敗へ読み替えずdependency substrate不足として停止し、`bun install --frozen-lockfile`の実行権限を確認する。lockfile drift、source生成、設定変更で自己補完しない。distribution drift、type error、blocking lint errorがあれば後続testをgreen扱いしない。
