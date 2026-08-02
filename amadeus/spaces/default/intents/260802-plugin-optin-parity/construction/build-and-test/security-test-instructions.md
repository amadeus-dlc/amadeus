# Security Test Instructions — plugin-optin-parity

`code-generation-plan.md` のpath containment・原子性と `code-summary.md` のfailure injectionを、file-based CLIの実在するsecurity境界として検証する。

## 実施範囲

```bash
bun test --timeout 120000 \
  tests/integration/t340-plugin-drop-fs-restore.integration.test.ts \
  tests/integration/t353-plugin-install-verb.integration.test.ts \
  tests/integration/t415-plugin-optin-selection.integration.test.ts \
  tests/integration/t415-plugin-optin-reconciliation.integration.test.ts
bun audit --production
git diff --exit-code -- package.json bun.lock
```

plugin名のclosed validation、project/host root外へのpath escape拒否、利用者管理staging保持、source/staging/config/compositionのtransaction復旧、secretを必要としない起動を確認する。

## 判定

- 対象security regression testは全成功し、path traversal・symlink/containment・部分状態残留を許さない。
- dependency auditと対象変更の判定を分離する。`package.json` / `bun.lock`に差分がないため、新規dependency由来のadvisoryは0件であることを確認する。既存advisoryがあればseverityと件数を結果に残し、このIntentで隠さない。
- DAST、認証・認可、AWS/IaC scanはHTTP service・identity境界・infrastructure変更が存在しないため非適用。非適用をsecurity PASSへ読み替えない。

## Coverage期待値

全failure stage、rollback時の空parent directory非残留、非current host byte不変、invalid plugin名の拒否を必須security assertionsとする。
