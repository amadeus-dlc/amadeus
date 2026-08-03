# Security Test Instructions — plugin projection parity

## 上流成果物と脅威境界

`code-generation-plan.md` と `code-summary.md` のNFR-3を安全性の正本とする。network、authentication、database、secret処理は追加されないためDAST、auth bypass、injection testは非適用である。対象脅威は、投影先pathの改ざん、所有外ファイルの削除、部分write、別harnessへの権限拡大、machine-local実行履歴の誤コミットである。

## 実行方法

```bash
bun test --timeout 120000 \
  tests/unit/t-plugin-projection.test.ts \
  tests/integration/t356-promote-self-plugin-carveout.integration.test.ts \
  tests/integration/t415-plugin-optin-reconciliation.integration.test.ts \
  tests/integration/t416-self-install-plugin-projection.integration.test.ts \
  tests/e2e/t416-self-projection-fresh-git.serial.test.ts
bun run lint
```

## Security合格条件

- manifest-owned閉包外のdestination、重複、衝突、Codex `.codex/skills`、root `.kiro` をfail-closedで拒否する。
- source validation失敗ではwrite-0、transaction途中失敗では全bytesをrollbackする。
- 未管理ファイル、別plugin、別harnessを上書き・削除しない。
- audit、drops、journal、lock、recovery、session／clone固有値が決定的projectionへ入らない。
- 診断はplugin、harness、pathまたは失敗段階を示し、秘密情報や環境値を出力しない。

## Dependencyとtest data

本変更ではdependencyを追加していないため、新規dependency vulnerability gateは不要である。test dataはsyntheticなtemporary treeと実Git fixtureだけを使い、利用者のrepositoryやcredentialへアクセスしない。
