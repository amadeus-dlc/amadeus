# Security Test Instructions

## Upstream coverageと脅威境界

4 Unitの`code-generation-plan.md`と`code-summary.md`、NFR-3/6/7、Security Designを入力にする。対象はlocal read-only CLIで、auth/network/database/IaCは存在しない。主なTampering/Information Disclosure/Data Integrityリスクはmalformed payload、digest mismatch、unsafe argv、CSV/Markdown injection、project file mutationである。

## 実行コマンド

```bash
bun test tests/unit/t486-stage-attribution-candidates.test.ts
bun test tests/unit/t486-stage-stats.test.ts tests/integration/t487-stage-stats.integration.test.ts
bun run lint
git diff -- package.json bun.lock
```

## 合格基準

- malformed/schema/digest/duplicate identityは修復・推定せずclosed reasonへfail-closedに分類する。
- unsafe stage/space/outlier、Markdown control/pipe、CSV comma/quoteが出力やpath境界を破らない。
- typed invariantは正常reportを出さず、malformed本文・secretをdiagnosticへechoしない。
- CLI実行前後でcorpus bytesが一致し、write API・network・新runtime dependencyを追加しない。
