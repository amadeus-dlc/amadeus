# Securityテスト手順 — Piハーネス正式対応

## 根拠と脅威対象

各Unitの`code-generation-plan.md`、`code-summary.md`、security design、NFR-SEC-001〜003を入力とする。対象はproject trust迂回、event/RPC入力改ざん、prompt・provider token・home path漏えい、PID再利用、package source差替え、setup filesystem競合、silent successである。

## 実行コマンド

```bash
bun test \
  tests/integration/t-pi-lifecycle-gate-adapter.test.ts \
  tests/unit/t-pi-driver-contract.test.ts \
  tests/integration/t-pi-doctor-diagnostics.test.ts \
  tests/integration/t-pi-package-candidate.test.ts \
  tests/integration/setup-transaction-coordinator.test.ts \
  tests/integration/t-pi-child-driver.integration.test.ts \
  tests/integration/t-pi-conformance-evidence.integration.test.ts \
  tests/e2e/t-pi-candidate-conformance.serial.test.ts
bun run no-silent-drop -- --base-revision 272cac2afa3f8f6245192885bcfa5aebeb11465a
```

## 合格基準

- trustを自動承認・迂回するmutationが0件である。
- RPC/extension入力によるhuman presence mintとgate approvalが0件である。
- credential、prompt本文、username/home絶対pathの平文出力が0件である。
- tampered catalog、moving/credentialed Git identity、symlink、case-fold/Unicode衝突をwrite前に拒否する。
- no-silent-dropが`NO_SILENT_DROP_OK`、findings 0である。

## 対象外と扱い

常駐HTTP service、database、container、IaCを追加していないためDAST、SQL injection、container/IaC scanは非適用である。Pi extensionとPackageはhost user権限で任意codeを実行し得るため、source確認、pin、update、uninstallの文書契約をsecurity evidenceに含める。
