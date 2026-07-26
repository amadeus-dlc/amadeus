# Code Generation Plan — fix-worktree-ref-family(#1482 / #1481 / #1455 / #1492)

上流入力(consumes 全数): `amadeus/spaces/default/intents/260725-worktree-ref-fixes/inception/requirements-analysis/requirements.md`

- 本 intent は bugfix スコープにつき units-generation / application-design / functional-design 系は SKIP(degrade 経路)。作業スコープは `requirements.md`(FR-1〜FR-4、Q1=A/Q2=B/Q3=A 裁定済み)と codekb(`architecture.md` / `code-structure.md`、observed `11f1ad61f`)から導出した。unit-of-work.md の不在は scope 設計どおり(`consumes_absent.expected: true`)であり内容を捏造しない。
- Test Strategy: Minimal(requirement-driven、リグレッション必須)。file:line は HEAD `9113a5106` 基準。

## トレーサビリティ(step → 要件)

| Step | 要件 | Issue |
|---|---|---|
| 1-2 | FR-1a〜d | #1481 / #1455 |
| 3-5 | FR-2a〜e | #1482 |
| 6 | FR-3a〜d | #1492 |
| 7 | FR-4a、NFR-2 | 全件 |
| 8 | FR-4b、NFR-1 | 全件 |

## Steps

- [x] **Step 1: 共有 git SHA helper の新設(FR-1a)** — `tests/harness/` に `currentGitSha()`(および必要なら `resolveGitRef()`)を 1 定義で新設。実装は `git rev-parse HEAD` サブプロセス委譲(`amadeus-lib.ts:4232-4239` `resolveMainCheckout()` の plumbing 様式)。git 内部レイアウト(loose ref / packed-refs / commondir)の FS 直読なし。解決失敗は loud throw(FR-1d)。
- [x] **Step 2: t257/t258/t259 の複製 helper 撤去(FR-1b)** — `tests/integration/t257-status-registry-migration.test.ts:193-216` / `t258-lifecycle-transaction.test.ts:434-457` / `t259-guard-integration.test.ts:77-98` の各複製を削除し Step 1 の共有 helper import へ置換。**着手前に worktree 上で 3 件の赤(exit 1)を再実測して記録**(自然な赤 = 落ちる実証、RE 実測の再確認)。修正後、worktree 上で 3 件 exit 0(FR-1c、named path)。
- [x] **Step 3: resolveProjectDirFromHook へ payload-cwd rung 追加(FR-2a)** — 正本 `packages/framework/core/tools/amadeus-lib.ts` の `resolveProjectDirFromHook`(:262)に最優先 rung を追加: 引数で受けた payload cwd が `hasWorkspaceMarker`(:242)を満たす場合のみ採用。不成立時は現行 ladder(env :264 → cwd marker :273-274 → script path :279 → cwd :290)へ変更なしフォールバック。旧挙動(env 無条件最優先)は置き換え(NFR-3、互換シム禁止)。
- [x] **Step 4: core hooks 11 本の payload cwd 配線(FR-2b)+ Stop hook 診断(FR-2e)** — `packages/framework/core/hooks/` の 11 hook(stop / mint-presence / audit-logger / sensor-fire / sync-statusline / runtime-compile / session-end / statusline / session-start / log-subagent / validate-state)が自身の stdin payload の `cwd` を解決関数へ渡す。stdin 未読の hook は fail-open で読み取り追加(読めなければ従来経路)。**着手前に Claude Code hook stdin の `cwd` フィールド実在を実測し、無ければ実装を止めて報告**(requirements 前提、deviation-stop)。kiro-ide adapter(`packages/framework/harness/kiro-ide/hooks/amadeus-kiro-adapter.ts:64`)は payload 語彙を実測し、`cwd` 相当が無ければ現状維持+コード注記。Stop hook のブロックメッセージへ解決 projectDir と state パスを追加。
- [x] **Step 5: t202 契約改訂+新規テスト(FR-2c/2d)** — `tests/unit/t202-hook-project-dir-worktree-marker.test.ts:105-117` test 2 を「payload cwd 不在時は env が勝つ」へ改訂。新規: (i) payload cwd(マーカーあり)> env (ii) payload cwd(マーカーなし)は棄却→env。unit 層は純関数呼び出しのみ(fs 実測が要る場合は integration 層へ)。
- [x] **Step 6: hook 起動行の既定値展開(FR-3a/3b)** — 起動行を `bun "${CLAUDE_PROJECT_DIR:-.}/.claude/hooks/amadeus-*.ts"` 形へ。変更面は 2 キー grep(変数名 `$CLAUDE_PROJECT_DIR` +リテラル `/.claude/hooks/`)で全数棚卸し(既知 4 正本: `.claude/settings.json` / `.claude/settings.json.example` / `packages/framework/harness/claude/settings.json.example` / `dist/claude/.claude/settings.json.example` — dist は regen で同期)。他ハーネス(codex/cursor/opencode/kiro 等)の同型起動行も棚卸しに含め、同一変更で同期。
- [x] **Step 7: リグレッションテスト(FR-4a)+配布同期(NFR-2)** — FR-3 の再現テスト(env unset で mint-presence を起動行同型コマンド実行 → exit 0+HUMAN_TURN 追記。integration 層)。修正前形の落ちる実証(env unset で module not found)は本セッション実測の記録を流用し、テストでは修正後形の green を固定。`bun scripts/package.ts` + `bun run promote:self` で dist 6 面+self-install を再生成。
- [x] **Step 8: 検証一式(NFR-1、FR-4b)** — `bun run typecheck` / `bun run lint` / `bun run dist:check` / `bun run promote:self:check` / `bash tests/run-tests.sh --ci` 全 exit 0。新規・変更行のローカル lcov 未カバー 0 を push 前実測(spawn 盲点: FR-1 helper・hook 配線行は in-process seam を確認)。センサー(linter / type-check)手動発火。

## テスト構成

- 既存 runner(`tests/run-tests.sh`)を使用、新規テスト設定ファイルは不要。
- 新規テストの配置: 実 FS/process を使うものは `tests/integration/`(fs-tests-integration-first)。テスト番号は既存最大値から事前予約して重複回避。

## 備考

- 本 worktree(`worktree-bugfix-1482-1481-1455`)がそのまま実装ブランチ。swarm/並行 fan-out は不使用(単一 fix unit、ソロモード)。
- `dist/` は手編集せず必ず regen(NFR-2)。
- 実装が要件・設計から逸脱する必要に気づいたら実装せず停止して報告(implementation-deviation、「既存様式への準拠と判断する場合も停止対象」)。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-26T01:25:00Z
- **Iteration:** 2
- **Scope decision:** none

iteration 1 Major-1(docs 4面8箇所の無効 JSON)是正を独立実測で確認(diff 8行1:1、6ブロック json.loads OK、無引用残存 grep 0件、実体設定と一致)。新規指摘なし。GoA 1。

### Findings

- iteration1 Major-1: docs 4面8箇所の JSON スニペットが無引用エスケープで無効 — 是正済み、iteration2 で独立検証
- iteration1 Minor-1(非ブロッキング): フル CI の t257 growth ratio 負荷起因 flake 1件 — 単独再実行 green×2+conductor 独立フル CI PASS で PR 欠陥でないと確定
