# code-summary — Bolt: fix-845-log-subagent（Issue #845）

## 概要

`amadeus-log-subagent`（SubagentStop フック)の2欠陥を修正した。

1. **完了ゲート欠落**: フックは `hasActiveWorkflowAudit`（監査シャード実在）だけをゲートにしていたため、workflow が `Status=Completed` の intent に対しても `SUBAGENT_COMPLETED` を追記し続けた。完了後にサブエージェントを走らせる各 worktree に unpushed 監査残渣が溜まる運用障害。
2. **agent_type 空文字素通し**: `parsed.agent_type ?? "unknown"` は空文字（`""`）を素通しする（`??` は null/undefined のみ置換）。Claude Code は generic Task agent に対し `agent_type` を空文字で渡すため、`**Agent Type**:`（空）が記録されていた。

archive `a2202f58b`（Issue #555, B003+FR-4)の契約に沿って修正。旧系譜の述語 `activeIntentIsComplete` は現行ライブラリに存在しないため、現行の状態ファイル駆動で等価な `activeWorkflowIsComplete` を新設した。

## 修正 file:line

### 判定ロジックの in-process seam（exported 純関数/準純関数）
- `packages/framework/core/tools/amadeus-lib.ts:1916` `activeWorkflowIsComplete(projectDir)` を新設。active space/intent を解決し `amadeus-state.md` の `Status` を読み、`"Completed"` / `"Complete"` を terminal と判定（statusline の判定と同一)。状態ファイル不在・読み取り失敗時は `false`(= Running 扱い、従来挙動維持）。
- `packages/framework/core/tools/amadeus-lib.ts:1937` `normalizeAgentType(raw)` を新設。`raw?.trim()` が空でなければ原値を verbatim 返し、空文字/空白のみ/nullish は `"unknown"`。

### フック本体（seam の呼び出し配線)
- `packages/framework/core/hooks/amadeus-log-subagent.ts:44` `const agentType = normalizeAgentType(parsed.agent_type);`（旧: `parsed.agent_type ?? "unknown"`)。
- `packages/framework/core/hooks/amadeus-log-subagent.ts:57` `if (activeWorkflowIsComplete(projectDir)) process.exit(0);` を `hasActiveWorkflowAudit` ゲート直後に追加。
- import 追加（`activeWorkflowIsComplete`, `normalizeAgentType`)。

### テスト
- `tests/unit/t211-log-subagent-complete-gate.test.ts` を新規追加。
- `tests/unit/gen-coverage-registry.test.ts:925` `EXPECTED_NONE_TO_CLI` に t211 を追記（新規 spawner の none→cli 再分類、PM1-12)。
- `tests/.coverage-registry.json` / `tests/.coverage-ratchet.json` を再生成（新 exported fn 2件を登録)。

## RED → GREEN 実測

修正前 RED は、フック本体の2変更のみを一時的に revert（lib 関数は import 解決のため残置)して dist を再生成し、t211 を実行して固定した。

RED（フック未修正、dist 再生成後):
```
(fail) Status=Completed intent: SUBAGENT_COMPLETED is NOT appended
(fail) Status=Complete intent: SUBAGENT_COMPLETED is NOT appended
(fail) empty agent_type "" is recorded as "unknown"   → Received: "**Agent Type**: \n"
(fail) whitespace-only agent_type is recorded as "unknown" → Received: "**Agent Type**:    \n"
 3 pass 4 fail
```
- Completed / Complete いずれも `SUBAGENT_COMPLETED` が追記された(ゲート欠落を実証)。
- 空文字/空白は `**Agent Type**: `（空）/`**Agent Type**:    ` が記録された（素通しを実証)。
- seam テスト（lib 関数直呼び)3件は lib が正しいため GREEN。

GREEN（フック修正 + dist 再生成後):
```
 8 pass 0 fail  (Ran 8 tests)
```

## 閉包実測（#845 verbatim 再現)

repo 外 scratch に fixture intent を作り dist フックを spawn（`CLAUDE_PROJECT_DIR` 明示、scratch-script-discipline 準拠)。

- **CASE A** `Status=Completed` + `{"agent_type":"developer",...}` → hook exit=0、`grep -c SUBAGENT_COMPLETED = 0`（no-op。追記なし = 修正成功)。
- **CASE B** `Status=Running` + `{"agent_type":""}` → hook exit=0、追記ブロックに `**Agent Type**: unknown`。

## in-process seam / lcov 実測

判定ロジックは lib の exported 関数へ抽出済み。t211 の seam テスト(`activeWorkflowIsComplete` の Running/Completed/Complete/状態不在/読取失敗(catch)分岐、`normalizeAgentType` の非空/空/空白/undefined/null/前後空白保持)で in-process 被覆。フックの呼び出し配線行は spawn 経由のため bun --coverage 不可視（既知の spawn-blindspot; 判定ロジックは seam 側で被覆済み)。

`dist/claude/.claude/tools/amadeus-lib.ts` の新規関数 lcov（DA)実測:
- 対象 14 DA 行(1916–1928, 1937–1938）すべて hits>0、**未カバー 0**。
- 当初 `} catch {` の構造行が DA:0 だったため、状態パスをディレクトリにして `readFileSync` を EISDIR で投げる catch 分岐テストを追加し解消（codecov/patch の構造的 false-red 予防)。

## 同根棚卸し（grep、修正はスコープ外・記録のみ)

### (a) 完了ゲート欠落の同型（`hasActiveWorkflowAudit` 利用箇所)
| ファイル | イベント | 評価 |
|---|---|---|
| `hooks/amadeus-audit-logger.ts:74` | `ARTIFACT_CREATED` | 完了後の成果物編集で追記されうる。ただし archive の #479/#555 は mint-presence / stop / log-subagent の3点のみをガードし audit-logger は意図的に未ガード(完了後の record 更新が正当な場合がある)。**要 Issue 判断**（本 Bolt スコープ外)。 |
| `hooks/amadeus-validate-state.ts:63` | `SESSION_COMPACTED` | 同上の候補。compaction は完了後も発生しうる。**要 Issue 判断**。 |
| `hooks/amadeus-sensor-fire.ts:103` | センサー dispatch | 意味論が異なる(検証発火であって監査残渣ではない)。同型ではないと判断。 |

→ audit-logger / validate-state の完了ゲート要否は #845 とは独立の設計判断（完了後追記が「残渣」か「正当な更新」か)を要するため、本 Bolt では修正せず記録に留める。conductor 判断で follow-up Issue 化を推奨。

### (b) 空文字素通し(`?? "unknown"` 等)の同型
| ファイル | 箇所 | 評価 |
|---|---|---|
| `hooks/amadeus-session-start.ts:184-190` | `getField(...) ?? "unknown"`（Lifecycle Phase / Current Stage / Status / Active Agent / Scope) | `getField` は欠落フィールドで `null`(→置換)、空フィールドで `""`(→素通し)を返すため同型。ただし入力は整形済みの `amadeus-state.md` フィールドで、実運用で空になることは考えにくく重大度は低い。**記録のみ**。 |
| `tools/amadeus-runtime.ts:1000,1040`, `tools/amadeus-sensor.ts:537`, `tools/amadeus-state.ts:1035,1985,2385` | `?? "unknown"` | いずれも `Map.get()?.x`／`code ??` 等で、対象値は空文字化しない経路(nullish のみ)。同型ではない。 |

→ agent_type のように「外部が確実に空文字を渡す」ケースは log-subagent 固有。session-start は同型だが低リスクのため記録のみ。

## 検証 exit code 一覧（deslop 後・最終)
| コマンド | exit |
|---|---|
| `bun run typecheck` | 0 |
| `bun run lint` | 0 |
| `bun run dist:check` | 0 |
| `bun run promote:self:check` | 0 |
| `bun tests/complexity-gate.ts --check` | 0（0 new violations, 0 regressions) |
| `bun tests/gen-coverage-registry.ts --check` | 0 |
| `bash tests/run-tests.sh --unit` | 0（RESULT: PASS) |
| `bun test tests/unit/t211-...test.ts` | 0（8 pass) |
| local lcov（新規 lib 行) | 未カバー 0 |

## deslop
main との diff から不要コメント除去(hook の agent_type 説明を lib と重複する2行から1行へ短縮)。挙動不変を全検証再実行(上表)で実証。

## dist 7面同期
`bun scripts/package.ts` + `bun run promote:self` を同一コミットに含める(source `packages/framework/core` + `.claude` + `.codex` + `dist/{claude,codex,kiro,kiro-ide}` の hooks/lib 全7面)。
