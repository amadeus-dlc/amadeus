# @amadeus-dlc/setup

`@amadeus-dlc/setup` は Amadeus DLC ワークスペース向けの Bun-first インストーラ package です。`amadeus-setup` コマンドで harness ファイルを安全に install / upgrade します。

## 前提

- **Bun が必須**です。hooks と CLI tools は Bun 経由で実行されます。
- `npx @amadeus-dlc/setup` は best-effort の wrapper です。Bun が PATH にない場合は `bun-required` エラーを返します。

## クイックスタート

```sh
# プロジェクト直下で harness を 1 つ install
bunx @amadeus-dlc/setup install --harness claude --yes

# 既存導入を upgrade
bunx @amadeus-dlc/setup upgrade --harness claude --yes
```

## サポート harness

1 回の実行で 1 harness のみ指定できます。

- `claude`
- `codex`
- `kiro`
- `kiro-ide`

## 主要オプション

| オプション | 用途 |
|---|---|
| `--target <path>` | install / upgrade 対象プロジェクト |
| `--version <tag>` | 明示バージョン（例: `v1.2.3`） |
| `--yes` | 非対話モードで確認をスキップ |
| `--force` | shared file を backup したうえで強制更新 |

## 安全動作

- shared file の上書き前に `<path>.<timestamp>.bk` 形式で backup を作成します。
- install / upgrade 成功後に manifest を `amadeus/.installer/amadeus-setup-manifest.json` へ書き込みます。
- `init` コマンドはサポートしません。setup は `install` を使います。

## 手動コピーのフォールバック

インストーラが使えない場合のみ、リポジトリの `dist/<harness>/` を手動コピーしてください。通常運用の主導線は `amadeus-setup install` / `upgrade` です。

## メンテナ向けリリース

`@amadeus-dlc/setup` の npm publish は GitHub Actions の **Release Setup Package** workflow（`.github/workflows/release-setup.yml`）を `workflow_dispatch` で手動実行します。`main` への merge や tag push では自動 publish しません。

1. Actions タブで **Release Setup Package** を開く
2. 初回は `dry_run: true` で preflight を確認
3. 本番 publish 時は `dry_run: false` と `confirm_package: @amadeus-dlc/setup` を指定し、protected environment `npm-publish` の承認後に publish する

詳細はリポジトリ root の [README.md](../../README.md) を参照してください。
