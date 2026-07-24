# Code Generation Plan — fix-1449-watcher-timeout(Issue #1449)

上流入力(consumes 全数): inception/requirements-analysis/requirements.md(実在)。functional-design / nfr-requirements / nfr-design / infrastructure-design / units-generation は bugfix スコープで SKIP(directive `consumes_absent` の `unit-of-work.md` は `expected:true`= スコープ設計上の不在)。本 bugfix は requirements.md と reverse-engineering codekb(architecture.md / code-quality-assessment.md)から直接スコープした。ユーザーストーリーは SKIP のため、各ステップは requirements の FR/NFR へ追跡する。

## 対象と方針

`packages/framework/core/tools/team-up.sh` の `verify_watchers_armed`(:1139 前後)の agmsg watcher readiness 再送ループを、選挙 E-WTFRA1(=C案)の裁定に従い、`WATCHER_RESEND_MAX` の既定値を **2→1** に縮小する。これにより `max_attempts = WATCHER_RESEND_MAX + 1` が 3→**2 ラウンド**となり、全メンバー unarmed 時の worst-case ブロッキングが 270秒(3×90)→**180秒(2×90)** へ確定する。純単発(1ラウンド)にしない理由は #1384(TUI cold-start での prompt 脱落)からの回復に最低1回の再送が必要なため(NFR-1b)。

外科的修正: ループ構造・exit code 分岐・`mux_attach` 前検証順序・リカバリガイダンス出力は不変とし、既定定数1点のみを変更する(surgical、後方互換シム追加なし)。

## 実装ステップ

- [x] **Step 1: 中核修正(FR-1 / AC-1a)** — `WATCHER_RESEND_MAX` の既定値を `${WATCHER_RESEND_MAX:-2}` → `${WATCHER_RESEND_MAX:-1}` に変更。合わせて worst-case バジェットを説明するコメント(定数ブロック + `verify_watchers_armed` ヘッダコメント)を 2ラウンド/180秒へ更新。※本ステップは wip コミット `9b851c5ae`(RA承認済み)で canonical へ適用済み・HEAD に含まれる。→ FR-1, AC-1a
- [x] **Step 2: per-wait 定数の接地維持(AC-1b / NFR-2)** — `WATCHER_READY_TIMEOUT` の既定値 90(agmsg spawn.sh:132 接地)は変更せず、再送回数(ラウンド数)のみを 3→2 へ減らす。→ AC-1b, NFR-2
- [x] **Step 3: 既存契約の保持(AC-1c / FR-3 / FR-4)** — exit code 分岐(0=全員armed / 非ゼロ=1名以上unarmed)、`mux_attach` 前の検証完了順序、no-silent-success、unarmed 名指し+リカバリガイダンス(`/agmsg mode monitor` 再送手順の stderr 出力)をいずれも保持。ループ本体は無改修。→ AC-1c, FR-3, FR-4
- [x] **Step 4: 回帰テスト追加(NFR-1a/1b/1c)** — `tests/integration/t-team-up-watcher-arming.test.ts` に describe「Issue #1449 re-send budget」を追加:
  - `WATCHER_READY_TIMEOUT defaults to 90`(NFR-1c: 既定解決の軽量定数 assert、実90秒待機なし)
  - `WATCHER_RESEND_MAX defaults to 1`(NFR-1a: 落ちる実証の注入面 = テストが読む canonical の既定定数)
  - `never-arm re-sends exactly once at the default budget`(NFR-1a: 既定バジェットでの再送ラウンド数=1 の挙動実測)
  - `a member armed after a single re-send still recovers`(NFR-1b: 再送1回でも #1384 回復経路が緑)
  → NFR-1a, NFR-1b, NFR-1c
- [x] **Step 5: 落ちる実証(NFR-1a、org.md Mandated)** — canonical `team-up.sh` の既定を pre-fix(`:-2`)へ一時退行させ NFR-1a テストが赤(defaults to 1 → 実測"2"、round count → send-text 2回)になることを実測 → fix へ復元して緑を実測。注入は fix コミット後・テストが読む面(canonical)に対し、`git checkout <ref> -- <path>` で面切替し1セットで完結(falling-proof-no-stash / injection-surface-verify)。→ NFR-1a
- [x] **Step 6: 配布物同期(制約 / project.md Way of Working)** — `bun scripts/package.ts`(dist 6面再生成)+ `bun run promote:self`(self-install 4面同期)を実行し、全 team-up.sh コピーを canonical と一致させる。→ 制約(正本→dist→self-install の同期)
- [x] **Step 7: 検証(制約 / Testing Posture)** — `bun run typecheck` / `bun run lint` / `bun run dist:check` / `bun run promote:self:check` / 対象 integration test を実行し全て緑を実測。→ 制約, NFR

## スコープ外(requirements 準拠)

- agmsg 側(`~/.agents/skills/agmsg/scripts/spawn.sh`)の変更は対象外。
- watcher arming 検証・再送機能自体(#1384 要件)の撤去は対象外。
- 実90秒統合テストの追加はしない(E-WTFRA2=A案、既存タイミングシームで短縮値検証)。

## テスト戦略

Minimal(bugfix スコープ)。対象 regression を第一級成果物とし、既存 integration テスト(7件)を維持したまま NFR-1a/1b/1c の4テストを追加(計11件)。実 FS を使う seam 検証のため integration 層に配置(cid:fs-tests-integration-first)。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-24T16:19:38Z
- **Iteration:** 1
- **Scope decision:** none

WATCHER_RESEND_MAX の既定を2→1に縮小する外科的修正で worst-case 180秒・#1384回復力・exit code契約・dist同期・落ちる実証を実測確認、逸脱・検証劇場なし

### Findings

- None
