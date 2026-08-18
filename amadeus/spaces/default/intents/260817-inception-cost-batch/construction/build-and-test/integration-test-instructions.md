# Integration Test Instructions — 260817-inception-cost-batch

上流入力: 両 Unit の `code-summary.md`、`component-dependency.md`(統合点)。

## 実行方法

```bash
bun test tests/integration/t3181-issue-evidence-fetch.integration.test.ts \
         tests/integration/t3181-issue-evidence-contract.integration.test.ts \
         tests/integration/t3181-issue-evidence-upstream-coverage.integration.test.ts \
         tests/integration/t2415-re-scan-exclusion-contract.integration.test.ts
```

## 統合境界と検証観点

| 境界 | テスト | 観点 |
|---|---|---|
| verb → gateway → 書込(C2↔C1↔C3) | t3181-…-fetch(17+reject 追加) | 全 Issue 原子的書込・冪等上書き・tmp 残渣ゼロ・loud fail 10 ケース・no-intent arm |
| 契約 ⇔ graph compile | t3181-…-contract | 配送 dist の artifactsRegistry / producersOf(optional_produces 経由)・RA consumes 逐語・RE frontmatter 非宣言の regression pin |
| sensor 実配線 | t3181-…-upstream-coverage | 実 dispatcher で引用欠落 fixture が FAILED(FR-EVD-7 の落ちる実証面) |
| 契約 ⇔ 定数 drift(U2) | t2415-…-contract | 正本逐語 = `RE_SCAN_EXCLUDED_PATHSPECS`(正本アーム)+配送ツリー同一性(配送アーム) |

- 外部依存: GitHub API はテストでは呼ばない(fake runner)。ライブ疎通は walking-skeleton demo(conductor 実測、105KB artifact)で別途確認済み
- 横断ゲート(t66 census / t212 optional-producer / t65 producer model / mechanism ratchet)は本 intent の変更で census 事実を更新済み — フルスイートはリモート CI 正(remote-first)
