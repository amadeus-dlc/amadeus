# Build & Test Results — 260801-kimi-bootstrap-deadlock

上流入力(consumes 全数): `../fix-1922-session-start-ordering/code-generation/code-generation-plan.md`、`../fix-1922-session-start-ordering/code-generation/code-summary.md`

実測日: 2026-08-01、tree = commit `9c844904d`(self-fix 済み、再生成物コミット込み)。

## 検証バッテリ実測(全コマンド exit code 実測)

| コマンド | exit | 結果 |
|---|---|---|
| `bun run typecheck`(tsc `--noEmit` ×2) | 0 | green |
| `bun run lint`(Biome) | 0 | green。294 warnings / 21 infos はすべて既存 baseline(cognitive-complexity 等)、変更ファイル(`packages/framework/core/hooks/amadeus-session-start.ts`、`tests/unit/t10-hook-session-start.test.ts`)への新規指摘なし |
| `bun run dist:check`(`bun scripts/package.ts --check`) | 0 | 7 harness tree すべて in sync |
| `bun run promote:self:check` | 0 | "project-local self install is in sync" |
| `bash tests/run-tests.sh --ci` | 0 | **RESULT: PASS**(下表参照) |
| `bun test tests/unit/t10-hook-session-start.test.ts`(focused) | 0 | **18 pass / 0 fail / 34 expect() calls**(972ms) |

## full suite 実測(`tests/run-tests.sh --ci`)

- Test files: **730** / Failed files: **0**
- Total assertions: **9989** / Failed assertions: **0**
- 所要時間: 約 **623 秒**(開始 13:30:15Z → 終了 13:40:38Z の runner 実測)
- SKIP: 24 ファイル(いずれも "Claude substrate unavailable; derived live mechanism" — 本環境に Claude CLI が無いことによる自己スキップ。本変更と無関係の既存仕様)
- **flaky timeout なし**: AGENTS.md の既知 caveat 対象4ファイル(t227-codex-migration-walking-skeleton、t-codex-hooks-ownership、t-codex-hooks-migration、t-team-up-codex-resume)はすべて初回実行で PASS。単独再実行は不要だった。
- wall-clock drift 報告 5 件(t-codex-hooks-migration、t-solo-standing-grant-opencode-mint、t225、t05、t17 の declared vs measured)は既存の drift 報告面であり、いずれも本 intent 非接触ファイル。

## coverage ゲート

- 今回の runner 起動(`bash tests/run-tests.sh --ci`)は coverage 計測を伴わない経路であり、coverage ゲート(project/patch/relative)は本実行では発動していない。coverage 計測は単独所有者の直列化が必須(project.md Testing Posture)のため、本ステージでは config の手調整も並行 coverage 起動も行わなかった。本変更の patch 被覆は t10 の改訂 pin 群(18 pass)が直接担う。

## 焦点検証の対称性(code-summary との照合)

- code-summary.md が記録した検証(t10 18/18、typecheck exit 0、biome exit 0、`package.ts --check` / `promote:self:check` exit 0、repo 外スモーク)を本ステージで独立に再実測し、すべて一致。dist drift は 0 のまま(再生成後に本ステージ実行まで hook 面の変更なし)。

## 失敗詳細

- なし(全項目 1 回目で green。再試行・flaky rerun なし)。
