# Unit Test Instructions — 260807-projectdir-worktree-fix

上流入力(consumes 全数): code-generation-plan（TDD ステップと対象テスト集合の正本）、code-summary（Red/Green 実測の出典）

## 対象と設計

要件駆動（Comprehensive だが対象は単一関数の梯子変更 — FR-2 が定める集合が上限。cid:build-and-test:bt-proportional-selection）:

- **t481**（`tests/integration/t481-resolve-project-dir-worktree-marker.test.ts`）— 正本 `amadeus-lib.ts` を in-process 直 import する純関数検証（lcov 有効・build 非依存）。実 FS（mkdtemp fixture）を使うため配置は integration 層（cid:code-generation:fs-tests-integration-first — in-process と層は独立の2軸）。7ケース:
  - ケース A（main cwd）/ C（worktree cwd × worktree lib）— 回帰なし pin（AC-1c）
  - ケース B 逐語形（worktree root cwd × env UNSET）+ 祖先形（marker-less 子 dir → worktree root）— 新段の主検証（AC-1a）
  - ケース C+env — **env 勝ち（main）を明示 pin**（AC-1b 改訂 = 意図された契約の保存）
  - marker なし cwd — 既存4段不変（AC-1d）
  - explicit 引数最優先（AC-1f）

## 実行方法

```bash
bun test tests/integration/t481-resolve-project-dir-worktree-marker.test.ts
```

期待: 7 pass / 0 fail、exit 0（実測済み — builder Green + conductor 再実行の2重確認）。

## TDD 実測記録（Red → Green）

- Red（実装前、exit 1）: C+env `Expected: ".../agent-fixture" / Received: ".../main"`、祖先形 B `Expected: ".../agent-fixture" / Received: ".../agent-fixture/packages/nested"`
- Green（実装後、exit 0）: 7/7
- AC-1a 逐語形の in-process Red は正本配置（rung 3 到達不能）により構造的に不能 — E-PWF-CGDEV 裁定（案C）により検証面注記を要件へ追加し、逐語形の回帰 pin は t144（integration-test-instructions.md 参照）が担う

## カバレッジ目標

新段の全行を t481 が in-process 駆動（spawn 盲点なし）。PR #2413 の Patch Coverage Gate PASS が権威判定（cid:code-generation:local-lcov-pre-push — coverage の正規判定は PR CI）。
