# Security Test Instructions

## 上流入力

`code-generation-plan.md`、`code-summary.md`、各 Unit の `security-requirements.md` を参照する。主な境界はローカル filesystem、JSON parse、registry row、選挙 ID と directory name である。

## セキュリティ検査

- corrupt JSON と不正 row は fail-closed とし、legacy directory へ黙って降格しない
- registry miss と legacy miss は loud error とする
- directory 一覧と registry の不一致は doctor で可視化する
- shell 評価、credential、ネットワーク入力を新設していないことを差分で確認する

## 実行方法

```bash
bun test \
  tests/integration/t259-elections-registry.integration.test.ts \
  tests/integration/t261-election-path-resolver.integration.test.ts \
  tests/integration/t264-elections-drift-doctor.integration.test.ts
bun run lint:check
```

## 判定

corrupt、unreadable、missing、duplicate、near-miss の各負例が pass し、検査自体の失敗が正常系に丸められないこと。DAST、認証・認可試験、依存脆弱性 scan は対応する実在面がないため N/A。
