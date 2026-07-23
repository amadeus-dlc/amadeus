# Security Test Instructions

## 脅威と入力

各Unitの `security-requirements.md` / `security-design.md` と `code-summary.md` を入力とする。主な脅威は、自由文からのcommand injection、不正config、path traversal、意図しないcreate/close、Receipt改ざん、stdout契約破壊である。

## 実行

```bash
bun test tests/unit/t232-amadeus-mirror.test.ts tests/unit/t258-amadeus-mirror-skill.test.ts tests/unit/t265-engine-boundary.test.ts
bun test tests/integration/t257-amadeus-mirror-config.integration.test.ts tests/integration/t265-engine-boundary.integration.test.ts
bun run lint:check
```

検証済みbasenameだけを単一argvで渡すこと、自動verbが固定`sync`だけであること、invalid config/Receiptがfail-closedであること、自由文を解析・実行しないことを確認する。

## 合格基準

高・重大finding 0、shell動的生成0、自動create/close 0、機密情報出力0、失敗時の永続状態変更0を必須とする。ネットワーク型DASTは本CLI変更に適用対象外である。
