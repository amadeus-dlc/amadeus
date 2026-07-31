# Unit Test Instructions — 260731-open-bug-batch-4

上流入力(consumes 全数): code-generation-plan.md — 各 unit の TDD Red→Green 手順から unit 層の検証対象を導出した。code-summary.md — 各 unit が宣言したテストスイートと pass 数を本書の期待値とした。

## 対象と手順

本 intent はバグ修正バッチ(self-fix)であり、unit 層の直接対象は fix-1816 の t281 のみ。他3 unit は integration 層(次書)。

- **fix-1816**: `bun test tests/unit/t281-amadeus-mirror-presentation.test.ts` — completionInstance 有り → `## Status` = Completed の導出描画ケース追加(Red 実測済み → Green)。既存2ケース期待値不変。

## 実行結果

- t281: 8 pass / 0 fail(conductor 裏取り実測 — builder worktree で t374 と合わせ 10 pass を確認済み、main worktree のフル CI にも包含)。
- フルベースライン: unit 層 164 small + 162 medium + 1 large、全 green(build-test-results.md 参照)。
