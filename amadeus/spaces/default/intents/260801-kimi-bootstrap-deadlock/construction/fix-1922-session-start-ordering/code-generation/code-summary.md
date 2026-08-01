# Code Summary — fix-1922-session-start-ordering

`requirements.md` + codekb からスコープ(fix-scope フォールバック;unit-of-work.md なし)。計画: 同ディレクトリの `code-generation-plan.md`。

## 変更ファイル

- `packages/framework/core/hooks/amadeus-session-start.ts`(source of truth)
- `tests/unit/t10-hook-session-start.test.ts`(pin 改訂 + 新規ケース)
- 再生成物(`bun scripts/package.ts` + `bun run promote:self` による。手編集なし): `dist/{claude,codex,cursor,kimi,kiro,kiro-ide,opencode}/.../hooks/amadeus-session-start.ts`、およびプロジェクトローカルの `.claude/`、`.codex/`、`.cursor/`、`.opencode/`、`.kimi-code/hooks/amadeus-session-start.ts`。

## Diff 内容(hook)

- FR-1: drain 済み `hookStdin` から `session_id` を parse する pre-guard ブロックを追加(try/catch 保護。malformed stdin は `sessionId = ""` のまま、post-guard で従来どおり `malformed` に分類)し、`if (sessionId) writeCurrentSessionId(projectDir, sessionId)` を `if (!existsSync(stateFile)) process.exit(0)` の前へ移動。配置は `repointHarnessIncludes` の先例に倣い、理由をコメントに明記: `.current-session` は workflow 非依存の per-user runtime state(amadeus-lib.ts:2147-2151)で、kimi caller-authorization + `isTrustedMainStop` の reader がこれ無しに fail-closed するため(#1922 bootstrap デッドロック)。no-op-on-empty と best-effort 性は不変(writer 自体は無変更)。
- FR-2: それ以外は一切移動していない。heartbeat、audit emission、`supplyResourceAttribute("session.id", …)`、resume rebind、context injection はすべてガード後段に残留。post-guard の parse ブロックは `source` 分類専任に縮小し、重複していた `let sessionId` 宣言と旧 post-guard write ブロックを除去(移動による orphan)。ヘッダコメント更新: state file 非存在時の hook は `.current-session` のみを書く。
- FR-3 (t10): `.sh` test 1 pin 改訂 — `session_id` 付き no-state fire で exit 0・空 stdout・かつ `.current-session` の内容が id と一致することを assert。`.sh` test 2 pin 改訂 — 同じ fire で heartbeat 不発・audit shard 不発(readAudit が空)を assert。新規ケース (b) — state file seed 済みで SESSION_STARTED 件数が +1(従来挙動どおり、NFR-1)かつ `.current-session` も書かれる。`workspaceRoot + SESSIONS_DIR + CURRENT_SESSION_FILE` をミラーする `currentSessionPath()` ヘルパー追加。ヘッダコメントブロックも新しいガード意味論に整合。

## 検証(コマンド + exit code)

- `bun test tests/unit/t10-hook-session-start.test.ts` → **18 pass / 0 fail / 34 expect() calls / exit 0**(再生成前は改訂 `.sh` test 1 pin が旧 dist コピーに対して **RED**: `.current-session` ENOENT — 旧挙動が書き込みを落とすことの実証。`package.ts` による dist 再生成後に green)。
- `tsc --noEmit -p tsconfig.json && tsc --noEmit -p tsconfig.tests.json`(`bun install --frozen-lockfile` 後に `./node_modules/.bin/tsc` で実行)→ **exit 0**。
- `bunx @biomejs/biome check packages/framework/core/hooks/ tests/unit/t10-hook-session-start.test.ts` → **exit 0**。3 warnings はすべて未変更ファイル(`amadeus-statusline.ts` ×2、`amadeus-stop.ts` ×1)の既存 cognitive-complexity baseline で、変更ファイルへの新規指摘なし。
- FR-4 再生成: `bun scripts/package.ts` → exit 0(7 harness tree 全て再生成);`bun run promote:self` → exit 0;`bun scripts/package.ts --check` → **exit 0**;`bun run promote:self:check` → **exit 0**("project-local self install is in sync")。
- 手動スモーク(repo 外): scratch project `/tmp/fix1922-smoke`(`amadeus/.amadeus-sessions/` のみ、intent/state file なし)で、インストール済み hook `.kimi-code/hooks/amadeus-session-start.ts` を stdin `{"hook_event_name":"SessionStart","source":"startup","session_id":"session_smoke-test"}` + `CLAUDE_PROJECT_DIR=/tmp/fix1922-smoke`(project-dir 解決 rung 2、amadeus-lib.ts:308)で実行 → hook exit 0、`/tmp/fix1922-smoke/amadeus/.amadeus-sessions/.current-session` が `session_smoke-test` を内容として作成された。修正前の no-state 経路ではこのファイルは作成されない(旧 dist コピーに対する改訂 t10 pin の失敗として実測済み)。

## 計画からの逸脱

- なし。補足: この worktree では `bun run typecheck` が exit 127 で失敗した(`node_modules` 未導入)。`bun install --frozen-lockfile` のうえ tsc を直接実行して解決。lockfile 変更なし(`bun.lock` は `git status` で clean)。

## 主要な判断

- session_id 抽出は `source` 分類ブロック全体を動かすのではなく、最小の独立 pre-guard parse とした: FR-2 の「それ以外は動かさない」契約を文字どおり守り、`malformed` の audit 分類を従来の位置に残すため。
