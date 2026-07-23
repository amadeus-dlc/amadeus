# セキュリティテスト手順

各 Unit の `code-generation-plan.md`、`code-summary.md`、security design を基に、host 環境の漏えい、command injection、配布境界の混同を検証する。

## 実行方法

```bash
bun test tests/integration/t240-election-transport.integration.test.ts
bun test tests/integration/t266-team-launcher-prerequisites.test.ts
bun test tests/e2e/t267-clean-env-team-mode.serial.cli.test.ts
bun run lint
bun run typecheck
```

## セキュリティ観点

- subprocess は配列 argv と明示 env を使い、shell interpolation を避ける。
- E2E 子プロセスへ host `process.env` を spread しない。
- missing dependency / unsupported OS は worktree、run record、ballot を作る前に失敗する。
- repository checkout の旧 tool を配布 skill から参照しない。
- fixture と audit に credentials、token、PII を書かない。

## 合格基準と制約

SAST 相当の TypeScript/Biome 検査が exit 0、隔離 E2E 5件が成功し、副作用なし assertion が成立すること。DAST やクラウド IAM 検証は本ローカル CLI 変更の対象外である。
