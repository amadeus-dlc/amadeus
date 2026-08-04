# Security Test 手順

上流入力(consumes 全数): `code-generation-plan.md`、`code-summary.md`

## 対象

`code-generation-plan.md` Step 4・5 と `code-summary.md` の JSON契約・workflow境界を入力とする。NFR-2 が要求する最小権限、短命 GitHub App token、secret 非露出、credential fallback 禁止、pure rebind／identity proofの3 path境界とreconciliation commitの5 path allowlist、force push 禁止を検証する。

## 実行コマンド

```sh
bun test --timeout 120000 tests/integration/t427-no-silent-drop-evidence-rebind.integration.test.ts tests/integration/t427-no-silent-drop-evidence-reconcile.integration.test.ts tests/integration/t427-no-silent-drop-evidence-workflow.integration.test.ts
bun audit
```

依存監査は repository 全体の現況を補助証拠として取得する。既知 advisory がある場合、今回追加した依存は0件であることと、対象 package／到達経路を分けて評価し、非0を無条件に成功へ丸めない。

## 合格条件

- workflow 既定権限は `contents: read`、write は既存 GitHub App token へ限定され、追加 secret／個人 token／bypass 主体がない。
- stdout JSON、stderr、job summary に token、private key、GitHub App credential が出ない。
- credential／validation／commit／push失敗は型付き error と非0終了になり、部分変更、force、fallbackを行わない。
- pure rebind／identity proofの境界は派生3ファイル、reconciliation commitのallowlistは派生3ファイルとledger 2ファイルからなる正確な5ファイルであり、各境界外の差分を commit／push前に拒否する。
