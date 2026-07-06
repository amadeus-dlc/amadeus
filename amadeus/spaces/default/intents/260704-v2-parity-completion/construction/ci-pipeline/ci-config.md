# CI Config

## パイプライン構成

CI は GitHub Actions（`.github/workflows/ci.yaml`）で、push（main）と pull_request で発火する。
実行本体は `npm run test:ci:mock` であり、この Intent で次の 1 段を追加した。

```
typecheck → lint:check → contracts:check → parity:check → claude-wiring:check
→ test:it:all → test:e2e:ci:mock → test:examples → diff:check
```

## この Intent での変更

- `parity:check` を `contracts:check` の直後に追加した（上流 fde1e1af との skill 一覧とエンジンファイルの差分ゼロ検査。基準は `dev-scripts/data/parity-baseline.json`、意図的差分は `dev-scripts/data/parity-map.json`）。
- `test:it:all` に `test:it:parity` を追加し、`test:it:index-generate` を退役した（GD009）。
- エンジンが書く audit shard を `.gitattributes` で whitespace 検査対象外にした。

## ローカル再現

`npm run test:all` が CI と同一の連鎖を実行する。
