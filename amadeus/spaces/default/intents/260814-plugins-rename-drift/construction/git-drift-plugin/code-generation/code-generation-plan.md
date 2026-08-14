# Code Generation Plan — git-drift-plugin

上流入力: `functional-design/business-logic-model.md`(detectDrift・落ちる実証 3 経路)、`business-rules.md`(R1〜R12)、`domain-entities.md`(DriftReport / port / plugin.json 宣言形)、`nfr-design/` 5 面。

## 実行形態

swarm batch 2(referee = `amadeus-swarm.ts`、driver = subagent floor)で `amadeus-builder-agent` に委譲。worktree `bolt-git-drift-plugin`(base = branch `bolt-plugin-settings-core` — U2 依存のスタック)。

## 計画

1. `plugins/git-drift/` 骨格(plugin.json: stages:[] + seams 2 + sensors + tools + settings 宣言)
2. conformance テスト(合成形状: compose → `.claude/sensors/` 投影 → graph compile の sensors_applicable、および seam id / manifest id 不一致の loud 失敗様式)
3. TDD で detectDrift(スロットル = fetch のみ skip・判定毎回、交差判定、台帳優先、fail-open 全経路)
4. 落ちる実証 3 経路(ローカル bare リポジトリ、実ネットワーク非依存)+ 非 git 不発火 + スロットル設定の実消費
5. `amadeus/config.json` の activation.names へ `git-drift` 追加
6. timeout_seconds を実 fetch 所要の実測から観測レンジ内側で確定

## 完了条件(remote-first)

- ローカル: typecheck / lint / complexity / source-only / targeted テスト green + 落ちる実証群
- blocking 検証の正はリモート CI(PR #3055 — #3052 へのスタック、#3052 マージ後に main へ retarget)

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-14T13:15:38Z
- **Iteration:** 1
- **Scope decision:** none

detectDrift設計・落ちる実証3経路・N/A報告は整合するが、FR-DRIFT-1が明示要求するplugin-conformance-e2e green実測が記録に一切現れない

### Findings

- BLOCKER | FR-DRIFT-1 の受け入れ(bun run build 後の全ハーネス投影 + plugin-conformance-e2e green)の実測が code-summary.md にも report にも現れない。フルスイート PASS では代替できず(project.md Testing Posture が別項目として列挙)、無申告のスコープ縮小に該当。リモート CI の 15 pass に暗黙に含まれる可能性はあるが記録上未確認

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-14T13:16:47Z
- **Iteration:** 2
- **Scope decision:** none

iteration 1 の BLOCKER(FR-DRIFT-1 の plugin-conformance-e2e green 実測欠落)は job id・run id・再取得コマンド付きで code-summary.md 追補節と pr-convergence-report.md に一致して記録され、解消を確認した。

### Findings

- None
