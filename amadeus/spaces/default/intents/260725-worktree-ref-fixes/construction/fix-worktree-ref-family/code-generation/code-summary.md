# Code Summary — fix-worktree-ref-family(#1482 / #1481 / #1455 / #1492)

上流入力(consumes 全数): `amadeus/spaces/default/intents/260725-worktree-ref-fixes/inception/requirements-analysis/requirements.md`

- 本 unit は bugfix degrade 経路(units-generation SKIP)につき、`requirements.md` の FR-1〜FR-4 と承認済み `code-generation-plan.md`(8 Steps)から直接スコープした。unit-of-work.md は不在が設計どおり。

## 変更ファイル(正本)

- **新規**: `tests/harness/git-sha.ts`(共有 `currentGitSha` — `git rev-parse` plumbing 委譲、loud throw、`env: process.env` 明示)/ `tests/integration/t296-hook-launch-and-worktree-resolution.test.ts`(7 tests)
- **core**: `packages/framework/core/tools/amadeus-lib.ts`(`resolveProjectDirFromHook` へ payload-cwd 最優先 rung〔marker 検証付き〕、`ClaudeCodeHookInput.cwd`、`readHookStdin`/`hookPayloadCwd`/`HookStdin` 新設)、`packages/framework/core/hooks/` 11 本(stdin payload cwd の配線、fail-open)、`amadeus-stop.ts` はブロックメッセージへ解決 projectDir/state パスを echo(FR-2e、`continuationReason` を export し in-process 検証可能に)
- **起動行(FR-3)**: `packages/framework/harness/claude/manifest.ts`(`renderClaudeHookCommand` を `bun "${CLAUDE_PROJECT_DIR:-.}/…"` 正準形へ)、`packages/framework/harness/claude/settings.json.example`、`.claude/settings.json`(live)、docs 対訳 4 面
- **テスト**: t202 改訂(test 2 → 「payload cwd 不在時は env が勝つ」+ test 7/8 新設)、t257/t258/t259(複製 helper 撤去→共有 import)、t231 系 2 面、coverage registry/allowlist 同期
- **生成物**: dist 6 面+self-install 4 面を `bun scripts/package.ts` + `bun run promote:self` で再生成(手編集なし)

## 主要な実装判断

- payload-cwd rung は `hasWorkspaceMarker` 成立時のみ採用 — 任意の session cwd による解決乗っ取りを防止(要件 FR-2a どおり)
- `readHookStdin` は意図的に非メモ化(同一プロセスで複数 hook を駆動する in-process テストが前 hook の payload を再利用する回帰を実測 → 撤去、コード注記あり)
- kiro-ide adapter は payload 語彙実測(`toolName`/`toolArgs`/`toolResult`/`toolSuccess` のみ、`cwd` 相当なし)により現状維持+注記(FR-2b の条件分岐どおり、外部 seam 未実測確約なし)
- Claude Code 2.1.220 実起動で hook stdin の `cwd` フィールド実在を 3 イベント(SessionStart/UserPromptSubmit/Stop)で実測してから実装(requirements「前提」の確定条件を充足)

## 落ちる実証

- FR-1: 修正前に本 worktree で t257/t258/t259 が exit 1(`cannot/Cannot/Unable to resolve Git ref refs/heads/worktree-bugfix-1482-1481-1455`、throw :214/:455/:96)→ 修正後 exit 0(named path)
- FR-2: t202 test 7/8 が旧実装(payload rung なし)では成立しない新契約を固定
- FR-3: 制御実測で「無引用×空白パス = exit 1 / 出荷形 = exit 0」を t296 に固定。当初前提(env unset→module not found)は bun の未文書 cwd-fallback により cwd=ルートで不成立 — **FR-3d はユーザー裁定(2026-07-26)で実測に合わせ改訂済み**、#1492 は Refs 維持+Issue へ実測コメント追記(継続調査)

## 検証(builder 実測+conductor 独立再実測の二重確認)

| 検証 | builder | conductor 独立 |
|---|---|---|
| typecheck / lint / dist:check / promote:self:check | 0 / 0 / 0 / 0 | 0 / 0 / 0 / 0 |
| `bash tests/run-tests.sh --ci` | 0(558 files、Failed 0) | 0(独立再実行、558 files、Failed 0) |
| t257 / t258 / t259 / t296 / t202 | 全 0 | 全 0(worktree = named path) |
| coverage patch gate | 0(added 43 / covered 39 / allowlisted 4 / uncovered 0) | — (CI 再実行に包含) |
| #1482 実プローブ | — | payload cwd=worktree が env=本線 に勝つ / payload 無しは env(実測) |

- allowlist 追加 3 エントリ 4 行(`amadeus-stop.ts` の `import.meta.main` 内 spawn 専用ブロック、reason+expiry 付き)。既存 4 エントリの行ピンを意味一致照合のうえ再ピン。
- センサー: linter / type-check 手動発火 SENSOR_PASSED、当 intent シャード SENSOR_FAILED 0 件。

## 計画からの逸脱

- FR-3d の前提乖離 1 件のみ(上記、ユーザー裁定で要件側を改訂 — 無申告逸脱なし)。実装途中の自作回帰 2 件(stop hook の deps snapshot / readHookStdin メモ化)は同一ターン内で検出・解消済み。
