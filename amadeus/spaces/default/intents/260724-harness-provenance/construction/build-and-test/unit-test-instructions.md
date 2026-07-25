# Unit Test Instructions — harness-provenance

上流入力: `harness-provenance/code-generation/code-generation-plan.md`, `harness-provenance/code-generation/code-summary.md`

## 対象

Standard 戦略の unit 層として、`tests/unit/t269-harness-provenance.test.ts` の純粋mapping契約を中核に、既存 seam の `t144-harness-seam.cli.test.ts` と diary template の `t100-memory-template-lifecycle.test.ts` を回帰確認する。process/CWD/filesystem境界を使う detector 分岐は、test-size purityに従い integration 層へ配置する。

対象コンポーネント:

- Harness detector: canonical mapping
- Public compatibility seam: `harnessDir()` の call-time env と non-env cache
- Memory template: 4 H2 と fresh `total=0`

## 実行

```bash
bun test \
  tests/unit/t269-harness-provenance.test.ts \
  tests/unit/t144-harness-seam.cli.test.ts \
  tests/unit/t100-memory-template-lifecycle.test.ts
```

## 成功条件とcoverage

- failure 0、skip 0。
- mapping契約、NFR-1、および公開 `harnessDir()` の既存優先順位を検証する。
- 固定 percentage を新設せず、`tests/.coverage-registry.json` の関数所有と既存 ratchet を維持する。
- 既存`t144`の subprocess case は環境変数と CWD を各caseで隔離し、順序依存を持たない。

## テストデータ

一時ディレクトリと synthetic harness tree のみを使う。production state、実ユーザーデータ、credential、network は使用しない。各テストは `finally` で fixture を削除する。
