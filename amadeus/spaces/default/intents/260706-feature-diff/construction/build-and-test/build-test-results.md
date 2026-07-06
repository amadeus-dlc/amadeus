# Build and Test Results

Unit: feature-diff
実施日: 2026-07-06（UTC）
実施環境: engineer4 worktree（branch: eng4/issue-524-feature-diff、基点 origin/main = b452f4fb）

## 上流入力

検証対象は code-generation の成果（内訳は [code-generation-plan.md](../feature-diff/code-generation/code-generation-plan.md) と [code-summary.md](../feature-diff/code-generation/code-summary.md) を参照）である。

## 結果

| 検証 | 結果 |
|---|---|
| repo 標準検証（npm run test:all） | pass（exit 0） |
| NFR-3 決定論チェック 3 点 | 全 PASS（出典空欄 0 / 正準 H2 欠落 0 / en-ja 構成 15=15） |
| rename-leftovers（docs 走査） | pass |
| record 構造検証（AmadeusValidator、Intent 指定込み） | 直後に fresh 実行し記録（本表の下段参照） |
| 文書内容検証 | reviewer（architecture）iteration 1 READY（fresh clone による実測全数検証、Issue 15 件実在確認、en/ja 全文照合） |

## 特記事項

- 実測値は上流 fresh clone（b67798c3）と Amadeus 両側で採取（scopes 9/10、tools 26/26、hooks 11/11、sensors 4/4、audit 70/71）。
- audit-format.md の header（71）と内訳合計（72）の既存 1 差不整合は本 Intent スコープ外として leader へ申し送り済み。
