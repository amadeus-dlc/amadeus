# Code Generation Plan — fix-1922-session-start-ordering

> 上流: `../../../inception/requirements-analysis/requirements.md`(FR-1..FR-4、NFR-1..3;Issue #1922 ESTABLISHED_WITH_REFINEMENTS)。fix scope では units-generation と unit-of-work.md は設計上 absent(ステージ規定のフォールバック)のため、requirements と codekb の証跡(`codekb/amadeus/architecture.md`、`code-structure.md`)から直接作業を編成する。テスト戦略: Minimal(fix scope)— 要件駆動の unit pin を既存 twin `tests/unit/t10-hook-session-start.test.ts` に改訂・追加。新規テストファイル・integration/E2E は対象外(build-and-test に委譲)。

## 問題

アクティブ intent を持たない kimi ワークスペース(fresh worktree、初回 `/amadeus`)では、SessionStart hook が `if (!existsSync(stateFile)) process.exit(0)` ガードで exit し、`writeCurrentSessionId(projectDir, sessionId)` に到達しない。`.current-session` は workflow 非依存の per-user runtime state(amadeus-lib.ts:2147-2151)であり、kimi caller-authorization + `isTrustedMainStop` の reader はこれが無いと fail-closed する — bootstrap デッドロック(#1922)。

## ステップ

- [x] Step 1 (FR-1): `packages/framework/core/hooks/amadeus-session-start.ts` において、drain 済み `hookStdin` から `session_id` を no-workflow ガードの**前**で抽出し、`writeCurrentSessionId` 呼び出しを(根拠コメントとともに)ガード前へ移動する。`repointHarnessIncludes` の先例(non-fatal・ガード前段)に倣い、配置が必須である理由をコメントに記録。no-op-on-empty-sessionId と best-effort 性は不変。
- [x] Step 2 (FR-2): heartbeat、audit emission、`supplyResourceAttribute("session.id", …)`、resume rebind、context injection はガード**後段に維持**。post-guard の stdin parse ブロックは `source` 分類専任とする(sessionId は前段で抽出済み)。ヘッダコメントも更新。
- [x] Step 3 (FR-3): t10 の 2 pin(`.sh` test 1/2)を新仕様に改訂 — no-state SessionStart が `amadeus/.amadeus-sessions/.current-session` に session id を書くことを肯定側として固定しつつ、heartbeat 不発・audit 不発も確認。ケース (b) 追加: state file 有りでは audit emission は従来どおり、かつ `.current-session` も書かれる。既存 twin と同一の spawn/fixture パターン。
- [x] Step 4 (FR-4): 配布面の再生成: `bun scripts/package.ts` + `bun run promote:self` を実行し、`bun scripts/package.ts --check` / `bun run promote:self:check` が exit 0 であることを検証。
- [x] Step 5: 検証: `bun test tests/unit/t10-hook-session-start.test.ts` が green、typecheck が green、変更パスへの biome check(baseline warning のみ)、repo 外の no-intent scratch dir でインストール済み `.kimi-code/hooks/amadeus-session-start.ts` に対する手動スモーク。

## トレーサビリティ

| Step | 要件 | 検証 |
|---|---|---|
| 1 | FR-1 | t10 `.sh` test 1 pin(改訂)+ スモーク |
| 2 | FR-2 / NFR-1 | t10 `.sh` tests 2, 10, 14-17(意味不変) |
| 3 | FR-3 | t10 改訂 pin + FR-3 ケース (b) |
| 4 | FR-4 | `package.ts --check` / `promote:self:check` exit 0 |
| 5 | NFR-1..3 | typecheck、biome、t10 18/18、スモーク |

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-01T13:25:57Z
- **Iteration:** 1
- **Scope decision:** none

FR-1..FR-4 and NFR-1..3 all satisfied; plan/summary evidence claims consistent with the two spot-checked implementation files; no over- or under-implementation. Findings: none.

### Findings

- None
