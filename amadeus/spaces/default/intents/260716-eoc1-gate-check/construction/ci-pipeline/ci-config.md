# CI Config — eoc1-gate-check

## 上流入力(consumes 全数)

`../eoc1-gate-guard/infrastructure-design/deployment-architecture.md`(既存合流)、`../eoc1-gate-guard/code-generation/code-summary.md`、`../build-and-test/build-test-results.md`、`../build-and-test/build-and-test-summary.md`。

## 構成(ci-pipeline:c2 — 既存 workflow を唯一の正本として文書化、新規生成なし)

既存 `.github/workflows/ci.yml` がそのまま検証面: typecheck / lint / dist drift(dist:check・promote:self:check)/ smoke+unit+integration(t-eoc1-gate-evidence 16 本を自動収集)/ coverage patch gate / complexity gate。本 intent 固有の追加配線なし(テストはランナーの規約収集で自動対象化 — registry 追記済み)。
