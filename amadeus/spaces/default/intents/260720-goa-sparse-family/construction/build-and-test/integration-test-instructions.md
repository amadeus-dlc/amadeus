# Integration Test Instructions — goa-sparse-family

上流入力(consumes 全数): `../goa-sparse-acceptance/code-generation/code-generation-plan.md`（`code-generation-plan`）、`../goa-sparse-acceptance/code-generation/code-summary.md`（`code-summary`）。Test Strategy は Comprehensive。

## 対象と実行

```sh
bun test \
  tests/integration/t-norm-metrics.test.ts \
  tests/integration/t236-election-loop.integration.test.ts \
  tests/e2e/t237-election-walking-skeleton.test.ts
```

## 境界検証

- memory 層を実FSから列挙し、head数・record抽出数・accepted/rejected分類を固定母数なしで全数照合する。
- election CLI の自然複節ID成功、malformed IDのloud拒否と exit code、既存 canonical/hold/tally 経路の非退行を確認する。
- 同一物理行複数head、改行、comment/paren/provenance境界を含む corpus で不正bodyを無音修復しない。
- test data は repository fixture または一時ディレクトリに隔離し、実 election store や user credentialへ依存しない。

## 合否基準

全 test/assertion が passし、failed file 0。実装から期待値を導出せず、承認済み FR/BR と corpus 構造を独立 oracle とする。
