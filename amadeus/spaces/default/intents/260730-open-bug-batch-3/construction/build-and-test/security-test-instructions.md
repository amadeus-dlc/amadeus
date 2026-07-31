# Security Test Instructions — 260730-open-bug-batch-3

上流入力(consumes 全数): 3 unit(fix-1752/fix-1773/fix-1772)の code-generation-plan.md / code-summary.md — セキュリティ関連面(認可・情報流出)を summary から抽出した。

## 対象面(実在境界へ trace)

- **#1773 = 情報流出の封鎖そのもの**: blind 独立性(未開票票の非開示)はセキュリティ性質であり、`tests/integration/t373-election-ballot-blind-storage.integration.test.ts` が (a) collecting 中の ledger 非出現 (b) gitignore の実測(git 経由の第2露出面封鎖)を固定する — これが本バッチのセキュリティテスト正本。
- **#1752 = 認可境界の維持**: create receipt 不在の report create 拒否(fail-closed)の維持を t265 integration が固定。
- **#1772**: BR-2 中核禁止(推薦マーカー・先行票・peer status 不搬送)の維持を t234 のキー集合 assert が執行。

## 比例選定の判定

新規の DAST/依存監査は requirements に trace できないため生成しない(cid:build-and-test:bt-proportional-selection)。依存追加は3 PR とも 0 件(package.json 変更なしを diff で確認済み)。
