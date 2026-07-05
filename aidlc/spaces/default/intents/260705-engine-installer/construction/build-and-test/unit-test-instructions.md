# Unit Test Instructions

Unit: u001-engine-installer

## 適用判断

独立した unit test ファイルは作成しない。純関数 `transformAmadeusMd`（正方向 throw、負方向パターン、空行圧縮）と `mergeSettings`（重複排除・順序保持・deep-equal）の検証は、専用 eval が合成 fixture への直接呼び出しと実ファイル駆動の両方で行っており（FR-2.6、FR-2.7）、unit / integration を分冊にする利得がない（単一ファイルスクリプト、Right-Sizing）。

## 検証観点

- 関数単位の検証は eval 内の合成 fixture 系 assertion（transformAmadeusMd の throw 6 変種ほか）が担う。
- 実行方法は `npm run test:it:installer`（eval 単独）または `npm run test:all`。
