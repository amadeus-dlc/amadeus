# Unit Test Instructions — 260817-inception-cost-batch

上流入力: 両 Unit の `code-summary.md`(実装済みテストの棚卸し)、`requirements.md`(FR→AC)。Test Strategy = Comprehensive(要件・リスク・NFR 駆動。15/コンポーネントは planning ceiling であり quota ではない)。

## 実行方法

```bash
# U1(main 着地済み)
bun test tests/unit/t3181-issue-evidence-path.test.ts \
         tests/unit/t3181-issue-evidence-gateway.test.ts \
         tests/unit/t3181-issue-evidence-artifact.test.ts
# U2(PR #3191 ブランチ)
bun test tests/integration/t2415-re-scan-exclusion.integration.test.ts
```

- フレームワーク: bun test(自作ランナー `tests/run-tests.sh` の unit 層)。追加セットアップ不要(gh は fake runner 注入)

## テスト構成(実装済み — 検証観点の対応)

| 対象 | ファイル | 観点 |
|---|---|---|
| C3 path resolver | t3181-issue-evidence-path(3件) | 正常解決・intent 不在 null・相対/絶対一致 |
| C1 gateway adapter | t3181-issue-evidence-gateway(16+境界追加) | argv 形・DTO parse・redaction・mixed-case リポジトリ・URL guard 負分岐(parse 不能/非 https/host/segment) |
| artifact 様式 | t3181-issue-evidence-artifact(9件) | メタデータ・marker 抽出・n/a 分岐(FR-EVD-6) |
| U2 述語 | t2415-re-scan-exclusion(8件) | 除外実効・specs 残存・帰属(未帰属0/二重0)・素形 0 件無音の負のコントロール |

- エラーパス第一級: readiness 失敗・API 途中失敗・parse 失敗・malformed 引数6形・promise reject(すべて TDD Red 先行 — code-summary の証跡表)
- カバレッジ目標: CI の Project Coverage Gate(絶対+相対 AND)と Patch Coverage Gate が blocking 正。dispatch-case 3行のみ意味的セレクタ allowlist(閉語彙適合を audit exit 0 で実測)
