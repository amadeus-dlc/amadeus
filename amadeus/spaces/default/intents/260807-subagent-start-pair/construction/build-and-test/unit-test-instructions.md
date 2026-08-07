# Unit Test Instructions — 260807-subagent-start-pair

上流入力(consumes 全数): code-generation-plan（TDD ステップと対象テストの正本）、code-summary（Red/Green 実測の転記元）

## 対象（unit 層）

| テスト | 検証内容 | 由来 |
|---|---|---|
| `tests/unit/t-subagent-purpose.test.ts` | AC-B1: `tool_name: "Agent"` で `subagentStartFields` がフィールド解決（新規 pin）。AC-B2 "Task" / AC-B3 "TaskUpdate"・"Write" → null / AC-B4 tool_name 不在（kimi 経路）の既存ピン群維持 | Unit B FR-B1 |

実行: `bun test tests/unit/t-subagent-purpose.test.ts`

## TDD Red の再現（歴史的記録 — 修正済みのため現行では再現しない）

実装前は `PreToolUse{Agent}` pin が `Received: null` で赤（13 pass / 1 fail, exit 1）。実装（SUBAGENT_DISPATCH_TOOLS 集合定数 + includes 判定）後 14 pass / 0 fail。

## 判定基準

- 14 pass / 0 fail、exit 0
- 既存15ピン（"Task" 6箇所等）が無改変で green（後方の挙動保存）
