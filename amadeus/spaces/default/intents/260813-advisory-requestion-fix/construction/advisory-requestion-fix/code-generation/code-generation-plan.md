# Code Generation Plan — unit `advisory-requestion-fix`

**Intent**: 260813-advisory-requestion-fix / **Scope**: self-fix(Minimal)/ **Test Strategy**: Comprehensive
**Scoped from**: `requirements.md`(FR-ADV-1〜8)+ codekb(units-generation / application-design は scope により SKIP — degraded input からのスコープ確定を記録)
**Traceability**: 各 Step 末尾の `→ FR-ADV-n` が要件への写像(user stories は scope SKIP のため要件 ID へ直接 trace)

前提の実測(着手前に builder が再確認する座標 — reviewer FOLLOW-UP 対応):
- `handoff_stage` の付与: `amadeus-advisory-choice.ts` の `directiveItemFor`/`declaredHandoffStage`(架電時実測 `:502-516` 近傍、architecture.md 別 intent 節は `:729-741` — 着手時に実読で確定)
- directive 型: `amadeus-directive.ts` の `AwaitAdvisoryChoiceDirective`(`:228-235`)と checker(`checkAwaitAdvisoryChoice`)
- 患部: `resolveRunRequiredHold`(`amadeus-advisory-choice.ts:682-701`)、`applyPendingAdvisoryGuard`(`amadeus-orchestrate.ts:826-874`)

方式(Q1 裁定 = handoff_stage 一本化): run-now receipt 済みで hold が継続する advisory は、ladder・人間へ再提示せず、**新しい型付き directive kind `execute-advisory-handoff`**(名称は実装時に既存 kind 命名規約へ合わせて最終化してよい)として emit し、conductor が named handoff stage を single モードで実行してから `next` を再評価する。`run_required`/`formal_checks` は復活しない。

## Steps(TDD: 各 slice で失敗テスト → Red 実測 → 最小実装 → Green)

- [x] **Step 1: Bolt worktree セットアップ** — `git worktree add`(base `origin/main`)で専用 worktree を作成し、`mise trust` / `bun install` / `bun run build` を実行(source-only 境界下の新規 worktree は自己インストール面を欠くため)。→ 基盤
- [x] **Step 2: FR-ADV-4 slice — recordAdvisoryChoice の型付き結果** — 失敗単体テスト: 「同一裁定の再記録は `settled`(冪等)、grounding 失敗等は `refused` として区別される」→ Red 実測 → `recordAdvisoryChoice` の戻りを判別可能な型(例: `"recorded" | "settled" | { refused: reason }`)へ変更し、既存 CLI 出力契約(`recorded`/`idempotent`)は維持。→ FR-ADV-4
- [x] **Step 3: FR-ADV-1/2 slice — handoff directive の emit** — 失敗統合テスト(隔離 project-dir): auto-decision の run-now receipt 保存済み store に対する次の orchestrator pass が `await-advisory-choice` を返さず、handoff stage 名を運ぶ型付き directive を返す → Red 実測(現行コードでは `await-advisory-choice` が返るため必然的に Red = 落ちる実証)→ 実装: (a) `amadeus-directive.ts` へ新 kind の interface + FIELDS + checker を追加 (b) `resolveRunRequiredHold` の verdict を「hold」から「handoff-required」相当の判別値へ (c) `applyPendingAdvisoryGuard` で receipt 済み経路を ladder 再入前に分岐し新 directive を返す。→ FR-ADV-1, FR-ADV-2
- [x] **Step 4: FR-ADV-7 slice — human-turn receipt のモード非依存回帰** — 失敗テスト: human-turn provenance の run-now receipt(autonomy none/gated 相当)でも同じ非再提示 + handoff directive → Red 実測 → (Step 3 実装で通る場合は追加実装なし、テストのみ固定)。→ FR-ADV-7
- [x] **Step 5: FR-ADV-6 slice — semi モード統合テスト** — semi autonomy 構成で ladder 裁定 → receipt 保存 → 次 pass の handoff directive までを通す統合テスト。→ FR-ADV-6
- [x] **Step 6: FR-ADV-3/8 既存契約の無退行確認** — t457 / t458 / t459 / t526 / t528 / t-advisory-choice-record / t-advisory-human-choice-boundaries を無改変で実行し green を実測(fail-closed 経路の human 提示、run-now は hold を解除しない契約、defer-with-risk の resolved→allow を維持)。既存テストの期待が新 verdict 名に触れる場合のみ、契約不変を保つ最小の期待値更新に留め、変更理由を code-summary に記録。→ FR-ADV-3, FR-ADV-8
- [x] **Step 7: FR-ADV-5 — ハーネス skill 契約8面の同期** — 8 harness 正本(claude:65 / codex:26,63 / cursor:62 / kimi:67 / kiro:63 / kiro-ide:63 / opencode:62 / pi:104-105)の `run_required`/`formal_checks` 消費記述を新 directive の消費手順(named handoff stage を `--single` で実行 → `next` 再評価、`report` は呼ばない)へ置換。`git grep -nE 'run_required|formal_checks' -- packages/framework/harness/` = 0 hit(exit 1)を実測。→ FR-ADV-5
- [x] **Step 8: docs / core protocol の消費者棚卸し** — `await-advisory-choice` / 新 kind について docs・`amadeus-common/protocols/stage-protocol.md`(:1008-1013 の run-now 手動経路記述)を grep 棚卸しし、新 directive での自動経路を反映(消費者棚卸しは grep 出力からの転記)。→ FR-ADV-2, FR-ADV-5
- [x] **Step 9: build + 配送先述語** — `bun run build` 実行、追跡ファイル不変(`git status`)+ 自己インストール面の `run_required` 0 hit(配送先ツリー述語)を実測。→ FR-ADV-5
- [x] **Step 10: 検証一式** — `bun run typecheck` / `bun run lint` / フルスイート(`bash tests/run-tests.sh --ci` 相当のローカル実行)green を実測。テスト path 列挙実行時は実在の機械確認と報告数照合。→ 全 FR

## テスト構成(Comprehensive strategy、要件駆動)

- 単体: Step 2(型付き結果)
- 統合: Step 3(full/auto-decision)、Step 4(human-turn)、Step 5(semi)— いずれも隔離 project-dir、実 record 非接触
- 既存回帰: Step 6 の7ファイル + フルスイート
- 性能・セキュリティ検査は生成しない(requirements.md「非機能要件」の判定: 適用可能な数値目標を持つ NFR 不在。検証劇場を作らない)
