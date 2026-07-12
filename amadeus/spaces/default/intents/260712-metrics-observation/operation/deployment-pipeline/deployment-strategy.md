# Deployment Strategy

## Strategy

`deployment-architecture.md` が定義するappend-only git deploymentを採用する。サービスtrafficの切替がないためblue/green、canary、rollingは適用せず、`cicd-pipeline.md` のmain限定jobで観測ファイルを着地させる。

## Promotion matrix

| Boundary | Gate | Outcome |
|---|---|---|
| PR → main | `quality-gates.md` のtypecheck/lint/build/test/coverage | merge可否 |
| main → snapshot generation | coverage成功、main push guard | JSON生成 |
| snapshot → main | atomic write、bot commit、bounded NFF retry | append-only着地 |

## Safety

- `ci-config.md` の5分timeout、最小権限、artifact固定名を維持する。
- snapshot job失敗は赤く可視化するが、PR mergeのcritical pathを延長しない。
- repository `GITHUB_TOKEN`以外へcredentialを変更する場合、非再帰保証を再評価する。

## Feature flags

runtime feature、traffic、environmentがないためfeature flagは導入しない。将来snapshot schemaを変更する場合は`schema_version`で互換性を管理する。
