# Unit Test Instructions

Unit: overlay-reverse（bugfix scope、Test Strategy: Minimal）

## 適用判断

逆変換の中核は純粋関数 `reverseModelOverlay(content, agentName, overlay)` である。単体検証は installer eval 内の「FR579 純粋関数の単体分岐」6 assertion で行う（隔離した temp ではなく import した実関数を直接呼ぶ形）。

## 対象と観測点

| 入力 | 期待 | eval |
|---|---|---|
| 宣言 agent + 実値 = 宣言モデル | base 書き込み | FR579-1.2 |
| 宣言 agent + 実値 = 宣言 fallback 先 | base 書き込み | FR579-1.2 |
| 宣言 agent + 実値が管理値集合外（opus 等） | 無変換 | FR579-1.2 |
| base 未記録（bootstrap window） | 無変換 | FR579-1.2 |
| overlay に未宣言の agent | 無変換 | FR579-1.1 |
| overlay = null（宣言ファイル不在、fail-open） | 無変換 | FR579-1.3 |

## 実行

`bun dev-scripts/evals/installer/check.ts`（`npm run test:all` にも含まれる）。
