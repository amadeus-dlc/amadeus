# Build and Test Results

Unit: no-stub-lint
実施日: 2026-07-06（UTC）
実施環境: engineer3 worktree（branch: eng3/issue-528-no-stub-lint、基点 origin/main = 7829d99a）

## 結果

| 検証 | コマンド | 結果 |
|---|---|---|
| 型検査 | `npm run typecheck` | pass |
| 専用 eval | `npm run test:it:no-stub-compat`（6 カテゴリ検出 / 宣言 pass 転化 / 無効宣言拒否 / 実ツリー回帰 / 配線 assert / token 境界の肯定・否定ケース） | pass |
| lint 一括 | `npm run lint:check`（3 rule） | pass（no-stub-compat: ok, 0 violations） |
| 既存 lints 回帰 | `npm run test:it:lints` | pass |
| repo 標準検証 | `npm run test:all`（token 一致変更後に再実行） | pass（exit 0） |
| record 構造検証 | `AmadeusValidator . 260706-no-stub-lint` | pass |

## TDD 証跡（RED → GREEN）

- rule 本体: eval 先行（check.ts 不在で RED）→ 実装 → 許可リスト宣言まで実ツリー回帰が 23 件を列挙して RED 継続 → 宣言 4 行で GREEN。
- token 一致変更（build-and-test 中の人間判断反映）: 否定ケース（compatibleFormat 等）追加で RED → matchBannedName を token 分解へ変更 → GREEN。実ツリー棚卸しは 23 件のまま不変。
- conductor 独立検証: 意図的違反（legacyBridgeForOldPath）の実地 fail → 宣言書式案内の出力 → 除去で pass 復帰。

## reviewer

- code-generation: iteration 1 READY（境界値の独自 fixture 検証つき。人間確認推奨 1 点 = 一致仕様は人間判断で token 境界へ変更し、本ステージで TDD 反映済み）。
