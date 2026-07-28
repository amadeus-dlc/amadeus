# External Dependency Map — 260727-plugin-verb-skills

上流入力(consumes 全数): requirements.md(受け入れ基準の CI 面)、unit-of-work.md(Unit 別検証)、team-practices.md(CI 規律)、bolt-plan.md 参照(components.md / unit-of-work-dependency.md / unit-of-work-story-map.md は Bolt 編成経由で消費)

## 外部依存

真に外部のサービス依存はなし(npm レジストリ・外部 API 不使用。GitHub は PR/CI の基盤としてのみ)。

## 内部の横断依存(Bolt が触れる共有面)

| 共有面 | 依存する Bolt | 性質 |
|---|---|---|
| t67(help/usage pin) | 1 | usage 三重同期の同一 PR 更新義務 |
| t129(runner drift、硬い数値 29/3) | 3 | repo では不変を維持(FR-4c)。fixture はホスト模擬で分離 |
| t341(plugin conformance E2E)+ plugin-conformance-e2e CI job | 2, 3 | green 維持(受け入れ基準4)。E2E 拡張は t341 系へ |
| dist×7 + self-install ツリー | 全 | 各 Bolt で再生成・drift check green(FR-5a 分配) |
| coverage patch / complexity baseline | 1, 2, 3 | in-process seam+匿名増ゼロ+local lcov pre-push |

## ブロッカー条件

なし(前提 #1596 は着地済み — feasibility raid-log の Dependencies 解消済みを継承)。
