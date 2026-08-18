# Code Generation Plan — issue-2837-invoke-swarm-context(Bolt 1)

Intent: 260818-priority-bug-batch-4(depth Minimal、Test Strategy Comprehensive、TDD 必須)

計画承認: full グラント梯子 AUTO_DECIDED `auto-decision-0c5d51c1ae9c38b18db859adbddbc01b`(grant `intent-grant-6a7132513338ba97ba55f186a0881cc2`、2026-08-18)

入力: `../../../inception/requirements-analysis/requirements.md`(FR-2837-1〜5)、`../../../inception/application-design/decisions.md` ADR-1(実装契約 1〜8 — 全項拘束)、`components.md` / `component-methods.md`(patch 面)、`unit-of-work.md`(U1 定義)。FD/NFR/インフラ設計は scope SKIP — ADR-1 実装契約が設計正本。

## 実装ステップ(traceability: step → FR)

- [x] Step 1: **Red 1** — invoke-swarm directive の batch identity 搬送を assert する失敗テストを追加(t135 の `--batch` ハードコードを導出検証へ置換する新 assert。emit された directive 実物に対して)。Red を実測記録 → FR-2837-1 / FR-2837-4(a)
- [x] Step 2: **Red 2** — failed-terminal 再提示回帰: 旧 batch が failed terminal の状態で同一 Unit が再提示されたとき、directive の運ぶ identity が旧 terminal pool(unit-pool 冪等鍵)と衝突しないことを assert。Red を実測記録 → FR-2837-4(b)
- [x] Step 3: directive 契約 — `InvokeSwarmDirective` 型 + `INVOKE_SWARM_FIELDS` + FIELD_CHECKS へ batch/pool identity フィールド追加、`prepared_batch`/`retry_unit` との排他/含意を fail-closed、`:306-311` の偽コメント訂正。**identity の形は ADR-1 契約2〜3 の許す 2 形から選定**(a: 数値 batch + generation 別フィールドを全読み口が同時消費 / b: identity 型の全面同時変更)し、選定根拠と join 面の全数 grep census(述語・件数)を code-summary へ記録 → FR-2837-1
- [x] Step 4: engine — `emitConfiguredSwarm` が identity を受領・搬送(`pick.batchNumber` 破棄をやめる)。DAG index join 面(ADR-1 契約3 の列挙 + 実装時再列挙)の同時整合 → FR-2837-1
- [x] Step 5: swarm CLI — `prepare --batch` validator と pool 冪等鍵の受理形を Step 3 の選定と同一変更で整合(engine が prepare に拒否される値を emit しない)→ FR-2837-1
- [x] Step 6: conductor 面 — 7 面の `--batch <n>` 手動指定を directive 搬送値の転記へ更新、全 8 面(pi 含む)へ check_cmd/test_file の正規取得元(conductor 知識、engine 非供給)を明記 → FR-2837-2 / FR-2837-3
- [x] Step 7: stale 参照修正 — `amadeus-bolt.ts:435-441`(Step 6.5 参照)と `amadeus-state.ts:6117-6121`(Step 0.6 参照)を現存手順(または手順非依存)の記述へ更新(挙動不変)→ FR-2837-5
- [x] Step 8: Green — Step 1/2 の Red 転化 + t135/t113/t181 連動更新の green + `bun run typecheck` + `bun run lint` + 対象テスト単体
- [x] Step 9: 台帳 resync — model-map 実装ハッシュピン(`updateModelMap --impl-only`)、coverage-patch-allowlist 再アンカー(必要時)、coverage-registry regen(新規テストファイル時)→ NFR
- [x] Step 10: `bun run build` → 配送先ツリー述語で受け入れ実測(8 面の正規取得元 grep 各 1+ hit / 7 面の転記化 / stale 参照 0 件 — いずれも exit code 記録)→ FR-2837-2/3/5 受け入れ
- [x] Step 11: code-summary.md(ファイル一覧・選定判断・census・Red/Green 証跡・逸脱)

## 制約(ADR-1 実装契約の要点)

- check_cmd/test_file を directive に載せない(契約1)。後方互換レイヤー・移行シム禁止(契約8)。join 一部修正の禁止 — 全数 sweep(契約3)。配送先ツリーでの受け入れ(契約6)
- 実装は bolt worktree(base main)で行い、conductor ツリー・他 worktree の git 状態に触れない。scratch は repo 外
- コミットは英語 Conventional Commits。push-first(commit 次第 push、フルスイートはリモート CI 正)

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-18T10:11:42Z
- **Iteration:** 1
- **Scope decision:** none

FR-2837-1〜5の実測証跡・census・配送先ツリー受け入れは強固だが、code-summary.mdの逸脱欄がdocs/reference/17-skill-system.md(英日)への変更を無申告のままplan未記載の作業として残しており、code-generation.md Step 5の逸脱申告要件に反する

### Findings

- BLOCKER | code-summary.md「変更ファイル」節が docs/reference/17-skill-system.md / .ja.md(directive 表への identity 搬送・check_cmd 非搬送の明記)を挙げているが、plan の全11 stepはこの2ファイルに言及せず逸脱欄も branching-strategies.md のみ開示 — Step 5 の逸脱申告要件と P3(無申告の逸脱)に反する
- FOLLOW-UP | R4(t181 落ちる実証)は復元後のテスト再緑化のみを残渣ゼロの根拠にしており、git status/diff 等の機械確認の記載がない
- FOLLOW-UP | 逸脱欄が引く reviewer C12 は requirements の Out of Scope 節では別件(finalize 偽 green)の識別子であり、branching-strategies.md 2 行との対応が本スコープ内資料から確認できない
- NIT | self-install 6 面の列挙で kiro-ide が現れない理由が無記載(.kiro 除外の理由のみ)

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-18T10:15:37Z
- **Iteration:** 2
- **Scope decision:** none

iteration-1の全4所見(BLOCKER1・FOLLOW-UP2・NIT1)が実測込みで是正され新規BLOCKERの混入もないためREADY

### Findings

- None
