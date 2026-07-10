# Re-scan 記録 — 260710-swarm-worktree-batch

> #707 契約(per-intent re-scan 記録)。差分ベース点の真実源はこのファイル(この intent 固有)。共有 `reverse-engineering-timestamp.md` は鮮度ポインタであってベース点ではない。

## スキャンメタデータ

- **base**: `fc5a34cf194aac05a4913e99eb7f9c4707d9d8e1`(タスク指定の前回 observed = 260710-mint-presence-vectors)
- **observed**: `11c52f153fe82fc642ee0004f2274e0b0db020fe`(`git rev-parse HEAD` 実測)
- **date**: 2026-07-10
- **intent**: `260710-swarm-worktree-batch`(swarm/worktree 整合系4バグ — #738 / #748 / #746 / #760)
- **scope**: bugfix
- **手法**: diff-refresh(project.md 是正 cid:reverse-engineering:c1)。フォーカス面は正本 `packages/framework/core/tools/` の実コード直読で file:line 確定。base→observed のフォーカス面コード diff は**空**(下記)。
- **実施体制**: Developer(スキャン)→ Architect(合成)の 2 サブエージェント直列(cid:reverse-engineering:c3)

## focus(スキャンスコープ)

- **swarm finalize の universe 契約**: `amadeus-swarm.ts:38-50`(authoritative gate 契約、`:40-44` lying-conductor guard)、`handleFinalize:495-582`(universe 導出 `:498`、`claimedSet :499`、ループ `:531`、claimed 分岐 `:532`)、merge-back `:588-599`、audit `:618-629`、envelope `:637-644`
- **fileTampered の untracked 経路**: `amadeus-swarm.ts:168-179`(status 128 を confirmed-untampered 化するコメント `:169-171` + `return result.status === 1` `:178`)、`verdictFor:191-217`(confine ガードの loud error 化 `:204-214`)、check `:451` / finalize `:533` 両消費点
- **worktree anchor の WRITE/READ 非対称**: 定義 `amadeus-lib.ts:1777-1779`(naive join)、WRITE 側 `worktree.ts` handleCreate `:261` / handleMerge `:348` / handleDiscard `:566` / list `:650-656`、`worktreeBaseDir:173-180`、`resolveWorktreeAnchor:139-164`、`resolveMainCheckout:114-124`。READ 側 10 呼び出し(`swarm.ts:197` / `state.ts:2569`,`:2723` / `bolt.ts:653` / `audit.ts:456`,`:570` / `runtime.ts:1172`,`:1263` / `utility.ts:960`,`:1074`)
- **worktree create base の fail-open**: `amadeus-worktree.ts:256`(local-only rev-parse)、fetch 前例 handleMerge `:358-366`(remote プレアウディット)/ `:382-390`(実 fetch)/ `:351-355`(audit 順序コメント)
- **c6 交差マップ**: 4修正の主変更ファイル:行域と交差点(swarm.ts トリオの密結合、#746 の worktree.ts seam リフト、#760 との worktree.ts 競合)
- **swarm テストの spawn 盲点**: `tests/e2e/t134-swarm-referee.test.ts`(全 CLI-spawn、`:166` runRef、case5/8/11)、`tests/integration/t135-invoke-swarm.test.ts`(CLI-spawn、lying-conductor `:236-247`)。#738/#748 のカバレッジ不在 + bun --coverage の spawn 盲点(Corrections c5)

## 差分の焦点影響(`fc5a34cf1..11c52f153`)

- `git diff --name-status fc5a34cf..11c52f15 -- ':!amadeus/' ':!dist/'` の実質差分は本フォーカス面に**非関与**。内訳:
  - `amadeus-lib.ts`(M)— human-presence 判定コメント + delegated-provenance 消費(`:1459` 付近)。フォーカス無関係。
  - `amadeus-state.ts`(M)— `handleGateStart`(`:1442` 付近、delegate-answer consume)のみ。**#746 が触る fork/merge(`:2569`/`:2723`)は無改変**。
  - `harness/codex/emit.ts`、`scripts/manifest-types.ts`、`scripts/package.ts`、新規テスト3本(delegate-answer / package-unreferenced-source)。全て無関係。
- **フォーカス面への影響: 無**。`amadeus-swarm.ts` / `amadeus-worktree.ts` / `amadeus-state.ts` の fork/merge / `amadeus-bolt.ts` / 各 read-side `worktreePath` 消費者は base の理解時点と**バイト同一**。以下の所見はすべて現 observed HEAD のコード直読に基づく。

## 焦点影響(合成が反映した先)

- `code-quality-assessment.md` — 先頭に「本 intent(swarm-worktree-batch)の観測面」節を新設: #738-O1(universe 黙殺)/ #748-O2(status 128 黙殺 + check/finalize 同族)/ #746-O3(WRITE anchor / READ naive 非対称、read-side 10 呼び出し)/ #760-O4(base fail-open)/ c6 交差マップ表 / テスト盲点(t134/t135 spawn、bun --coverage 盲点、seam 設計義務)。前 intent(mint-presence-vectors)節を「前 intent」へ relabel(c3-relabel)。
- `architecture.md` — 「worktree anchor 機構の WRITE/READ 非対称(#746)」構造節を追補(mermaid + text fallback + read-side 10 呼び出しの列挙)。top banner の stale「本 intent は #735」を履歴ラベルへ更新。
- `reverse-engineering-timestamp.md` — 本 intent メタで鮮度ポインタ更新(前 intent 節温存)。
- その他成果物(business-overview / api-documentation / code-structure / component-inventory / dependencies / technology-stack)は base→observed 無変更かつ本 intent 観測面と無関係のため温存(churn 回避)。
