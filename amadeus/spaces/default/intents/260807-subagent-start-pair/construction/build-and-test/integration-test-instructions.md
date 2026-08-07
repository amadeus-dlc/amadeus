# Integration Test Instructions — 260807-subagent-start-pair

上流入力(consumes 全数): code-generation-plan（対象テストと検証面の正本）、code-summary（実測結果の転記元）

## 対象（integration 層 — 実 FS 読み / フック spawn 経路）

| テスト | 検証内容 | 由来 |
|---|---|---|
| `tests/integration/t483-claude-live-settings-inclusion.integration.test.ts`（新規） | FR-A3/A4: example ⊆ live の包含ガード + waiver 接地（Issue #2426 参照・理由必須・負ケース・stale 検査・example-anchoring） | Unit A |
| `tests/integration/hook-dispatcher.integration.test.ts`（導出形改訂） | HOOK_PATHS export からの導出ピン（`EXPECTED_HOOK_REFERENCES = KNOWN_SLUGS.length + DUPLICATE_SLUG_REFERENCES`）+ fail-closed（未知 slug 拒否）保存 | Unit A（E-SSP-CGDEV 裁定） |
| `tests/integration/t-log-subagent-start.integration.test.ts` | FR-C1: `tool_name: "Agent"` の dispatch がフック spawn 経路で SUBAGENT_STARTED を1行 emit。既存 "Task" ケース維持。**dist 面を読むため `bun run build` 後に実行** | Unit B |
| `tests/integration/t454-subagent-model-attribution.integration.test.ts` | 既存8ピン不変（波及なしの確認） | Unit B |

実行: `bun test <上記4ファイル>`（t-log-subagent-start は build 後）

## 落ちる実証（実施済み — code-summary 記録）

- Unit A（AC-A3）: live から PreToolUse 除去 → t483 が 3 pass / 2 fail → shasum 一致復元 → green。1セット不可分
- Unit A（CodeRabbit 是正）: ghost waiver 注入 → example-anchoring assertion 赤 → 除去 → 6 pass
- Unit B（FR-C1）: dist 面へ pre-fix 語彙 `["Task"]` 注入 → `Expected length: 1 / Received length: 0` の赤 → diff IDENTICAL 復元 → green

## end-to-end（実配線）

`bun .claude/hooks/amadeus-dispatch.ts log-subagent-start` = exit 0（フック実走）。`bogus-slug` = exit 1 で 11 slug 列挙拒否（fail-closed）。

## 判定基準

4ファイル合同で全 pass / 0 fail、exit 0（実測: t483 6 + hook-dispatcher 9 + t-log-subagent-start 10 + t454 19）。
