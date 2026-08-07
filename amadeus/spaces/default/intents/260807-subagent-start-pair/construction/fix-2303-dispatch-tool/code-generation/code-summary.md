# Code Summary — fix-2303-dispatch-tool

上流入力(consumes 全数): requirements（`inception/requirements-analysis/requirements.md` — 本 unit の設計正本。FR-B1〜B4 / AC-B1〜B5 / FR-C1 をここから直接スコープした。self-fix scope は units-generation を SKIP するため unit-of-work.md は不在 = consumes_absent expected:true）

- Unit: fix-2303-dispatch-tool（degrade 2-unit 構成の Unit B — Issue #2303）
- Test Strategy: Comprehensive
- トレーサビリティ: 全変更は captured intent（#2303）と requirements FR-B1〜B4 / AC-B1〜B5 / FR-C1 へ遡る。user stories は scope SKIP のため intent 直結。

## 実装の中核（FR-B1）

`packages/framework/core/tools/amadeus-lib.ts` の単数定数 `SUBAGENT_DISPATCH_TOOL = "Task"` を集合定数へ置換:

- `:4133` — `SUBAGENT_DISPATCH_TOOLS = ["Task", "Agent"] as const`
- `:4171` — ガードを `!(SUBAGENT_DISPATCH_TOOLS as readonly string[]).includes(payload.tool_name)` の includes 判定へ
- **`tool_name !== undefined` の短絡は無改変**（kimi 経路 AC-B4 保全）
- doc-comment を新語彙へ更新し、settings の matcher `^Task$` が内部名 `Agent` の payload に発火する非直観を明記（FR-B2）

## 変更ファイル（tracked 11件）

| ファイル | 変更 |
|---|---|
| `packages/framework/core/tools/amadeus-lib.ts` | FR-B1/B2 — 集合定数 + includes ガード + doc-comment |
| `packages/framework/core/hooks/amadeus-log-subagent-start.ts` | :10-12 両綴り受理を明記（FR-B3） |
| `packages/framework/core/knowledge/amadeus-shared/audit-format.md` | :176 `(PreToolUse{Task} / SubagentStart)` → `(PreToolUse on a dispatch tool / SubagentStart)`。:181 散文は既に中立（実読確認・変更不要） |
| `docs/reference/06-hooks-and-tools.md` / `.ja.md` | :46/:215（ja :44/:213）へ両受理（Task と内部名 Agent、#2303）を追記。:26/:205/:208 は matcher 記述のため要件どおり対象外 |
| `docs/reference/12-state-machine.md` | :400 `Claude PreToolUse{Task}` → `Claude PreToolUse on a dispatch tool` |
| `docs/reference/23-telemetry-schema.md` / `.ja.md` | stale cite 訂正: :194（ja :189）`:4430`/`:4456-4457` → `:4133`/`:4171`、:198（ja :193）`:4456-4467` → `:4170-4182`。**申告付き列挙拡張**: 同段落内の同クラス2件も訂正 — :203（ja :198）`:4437-4442` → `:4140-4145`（subagentPurposeLine）、:205（ja :200）`:4425` → `:4123`（SUBAGENT_PURPOSE_MAX_LENGTH）。行番号は grep -n 実出力からの機械転記 |
| `tests/unit/t-subagent-purpose.test.ts` | AC-B1 の新規 pin（`tool_name: "Agent"` でフィールド解決）。既存ピン群は無改変 |
| `tests/integration/t-log-subagent-start.integration.test.ts` | FR-C1 — `tool_name: "Agent"` dispatch で SUBAGENT_STARTED 監査行 1行 emit のフック spawn 経路実証。既存 "Task" ケース維持 |
| `tests/.coverage-registry.json` | unitId の集合定数名同期 + 再生成（FR-B4） |

`.claude/` は `.gitignore:24 /.claude/**` で ignore された生成面のため直接編集せず、正本編集 → `bun run build` で伝播（8ハーネス再生成、1回目成功）。build 後の tracked 差分は上記11件のみ。

## Red / Green 実測

**Red（AC-B1、実装前）** — `bun test tests/unit/t-subagent-purpose.test.ts` = 13 pass / 1 fail, exit 1

```
error: expect(received).toEqual(expected)
- { "Agent Type": "developer", "Purpose": "Do the thing" }
+ null
(fail) subagentStartFields (U4, FR-SUB) > PreToolUse{Agent}: the internal dispatch name resolves the same way
```

**Green（実装後）**

| 検証 | 結果 |
|---|---|
| t-subagent-purpose.test.ts | 14 pass / 0 fail（AC-B2 "Task" / AC-B3 "TaskUpdate"・"Write" → null / AC-B4 tool_name 不在、全維持） |
| t-log-subagent-start.integration.test.ts | 10 pass / 0 fail |
| t454-subagent-model-attribution.integration.test.ts | 19 pass / 0 fail（既存8ピン不変） |
| 3ファイル合同 | 43 pass / 0 fail / 118 assertions, exit 0 |
| `bun run typecheck` | exit 0 |
| `bun run lint` | exit 0（warning 443 は全て既存、amadeus-lib.ts は 0 hit） |
| `bun run build` | exit 0 |
| `bun run source-only:check` | exit 0（source-only boundary: clean） |
| `bun tests/gen-coverage-registry.ts --check` | exit 0（OK (fresh, guards green, ratchet held)） |

## 落ちる実証（FR-C1 元欠陥への貫通）

テストが実際に読む面（`dist/claude/.claude/tools/amadeus-lib.ts` — untracked 生成物）へ pre-fix 語彙 `["Task"]` を注入して実測（injection-surface-verify 準拠）:

- 注入後: `Expected length: 1 / Received length: 0` — `the same dispatch under its INTERNAL tool name records one row (#2303)` が赤（9 pass / 1 fail, exit 1）
- 復元: `diff dist/... packages/...` = IDENTICAL → 再実行 10 pass
- 注入→赤→復元→残渣ゼロを不可分の1セットで完了（falling-proof-injection-one-set 準拠）

## AC-B5 grep

`grep -rn 'PreToolUse{Task}' packages docs .claude/knowledge` → exit 1（0 件）。全ツリー sweep の残存は tests のタイトル2件（設定上の matcher は今も `^Task$` のため記述として正確）と codekb/record 10件（`cid:requirements-analysis:c1-ac-grep-surface-scope` により記録面は対象外）のみ。dist/ と .claude/ も 0 件 — 正本の書き換えが self-install 面まで伝播済み。

## 逸脱

実装逸脱なし。申告2点:

1. **列挙の拡張（受理済み）**: 名指し stale cite 2件に加え同段落内の同クラス2件を追加訂正。conductor は `cid:code-generation:same-root-inventory`（同根パターンの同一変更内修正）の機械的執行として受理した。
2. **既存 doc drift の発見（スコープ外・未修正）**: `docs/reference/12-state-machine.ja.md` に SUBAGENT_STARTED 行自体が不在（en 565行 vs ja 501行）。行の新規追加は対訳欠落の補填という別スコープのため見送り、Issue 起票候補として conductor へ報告済み。

## 隔離規律

Unit A の患部（`.claude/settings.json` / `amadeus-dispatch.ts` / t483）は一切未接触。git commit・state 変更コマンドは不実行。作業は割当 worktree 内で完結。
