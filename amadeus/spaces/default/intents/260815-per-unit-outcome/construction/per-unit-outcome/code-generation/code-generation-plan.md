# Code Generation Plan — unit per-unit-outcome(Issue #3099)

## 裁定(拘束)

- 方式: **C — per-unit 経路の unit 完了時に engine が unit outcome を監査へ記録**(選挙 E-260815-3099-FIX-METHOD、2-0、favor 2)
- 実装形: **C2 — 専用の新監査イベントを発行し、fanout 読み口を最小拡張**(runoff 選挙 E-260815-3099-C-FORM、2-0、GoA 2/2)。pool の単一 writer 契約(`UNIT_POOL_EVENT_SET_COMMITTED` は swarm ライフサイクルのみ)は不変

## 採用条件(両票の留保 — すべて拘束)

1. **冪等発行**: 鍵 = intent + stage + unit + batch。`next` 再入で重複 emit しない(既存イベントを読んでから発行)
2. **発行点**: unit の coverage 成立境界(unitCovered が true へ遷移する時点)。過去時刻の後付け生成禁止(append-only)
3. **pool 名前空間の非汚染**: 新イベントを `readUnitPoolEventSetsFromAudit` の入力集合(batchId 名前空間)へ fold しない — 別イベント型として読む
4. **pool 優先の単一化(de-dup)**: `readPerUnitConsumePopulation` の既存ループ(orchestrate.ts:2459-2463、currentUnits 数値 batch join)を逐語保存し、新イベント由来 outcome は「pool terminal が既に存在する unit には積まない」。併存断面で `producer-outcome-ambiguous`(fanout.ts:207-212)を誘発しないことを落ちる実証付きテストで固定
5. **台帳・文書の同一変更同期**(FR-6 + 留保の全列挙):
   - `packages/framework/core/otel/event-registry.ts`(:951-960 様式の新エントリ)
   - `packages/framework/core/tools/amadeus-audit.ts`(CANONICAL_AUDIT_EVENTS / VALID_EVENT_TYPES + EVENT_HEADINGS + EXPECTED_CANONICAL_COUNT)
   - `.claude/knowledge/amadeus-shared/audit-format.md`(正本は packages/framework/core/…)の Event Registry 表・見出し件数
   - `docs/reference/12-state-machine.md` + `.ja.md`
   - `tests/unit/t28-audit-event-sync.test.ts` の pinned baseline bump(設計済み拡張点)
   - `tests/.coverage-registry.json` regen(新規テストファイル・新規 export の追加時)
   - `amadeus/spaces/default/specs/tla/model-map.json` の orchestrate.ts 実装ハッシュピン ×2 resync

## 設計

- 新イベント名(案): `UNIT_OUTCOME_SETTLED`(canonical 命名は amadeus-audit.ts の既存語彙に合わせて実装時確定)。attributes: intent / stage(= code-generation)/ unit / batch(数値)/ outcome(succeeded)/ idempotencyKey(intent+stage+unit+batch 由来)
- 発行点: `emitPerUnitRunStage`(orchestrate.ts:4574-4725)の unitCovered 遷移観測部。emit 前に同鍵イベントの存在を読む(冪等)
- 読み口: `readPerUnitConsumePopulation`(:2447-2473)に新イベント読取を追加。pool 由来 terminal を持つ unit はスキップ(pool 優先)。currentUnits フィルタは逐語不変
- 触らない面: `amadeus-unit-pool-runtime.ts`(writer/reader とも不変)、`amadeus-construction-outcome-projection.ts`(CONSTRUCTION_AUDIT_EVENTS 不変 — 新イベントは fanout 専用の読み口)、`amadeus-lib.ts:8416`(幅1 early return — dispatch 意味論は RFC-0001 域のため不変)

## TDD 順序(FR 対応)

1. **Red(FR-2/FR-1)**: t533 integration に per-unit 経路 seed の再現ケースを追加(pool 非経由・幅1 batch 相当) → `producer-outcome-pending` の Red を実測
2. **Green**: 新イベント emit + 読み口拡張の最小実装
3. **Red→Green(留保4)**: pool terminal + 新イベント併存 → ambiguous を誘発しない(pool 優先 de-dup)
4. **FR-3**: 母集団外 unit の新イベント混入 → 判定不変
5. **冪等(留保1)**: 同鍵で 2 回 emit 経路を通しても 1 行
6. **FR-7**: 既存スイート(t533 unit 8 / integration 14・t425・projection・swarm guards)無改変 Green

## 検証・配送

- ローカル: typecheck / lint / 対象テスト(秒〜十秒級)まで。**push-first** — commit 次第 push + PR 作成、blocking はリモート CI(`ci-success`)を正とする
- 台帳 resync(model-map)→ フルスイートはリモート
- worktree: `bolt-per-unit-outcome`(base = origin/main)で実装(solo-bolt-worktree-required)。適用実測は record へ、一般回復手順は docs/guide へ(FR-5 — 実装と同一 PR)

## FR-5(回復手順文書)

- `docs/guide/` に「per-unit 完走後に producer-outcome-pending で停止した intent の回復」節を追加: 修正着地後の engine では `next` が新イベントの遡及 emit なしで前進すること(unitCovered は成果物断面から再導出されるため、pool 捏造は不要)を確認する手順。record 側には 260814-open-bug-batch-6 への適用計画を記す

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-15T09:35:01Z
- **Iteration:** 2
- **Scope decision:** none

Both prior BLOCKERs resolved with measured evidence (FR-4 non-touch + 8/8 edge-drift pass; FR-5 record-side recovery-application-plan.md); plan/summary now cover all seven FRs and five binding reservations without silent gaps or unrequested compat layers.

### Findings

- FOLLOW-UP | code-generation produces list | recovery-application-plan.md is a fourth artifact beyond the declared produces triple; conductor to confirm downstream tooling treats the extra file safely
- FOLLOW-UP | recovery-application-plan.md | step-3 cursor rewind is not test-driven; the first live application to 260814-open-bug-batch-6 is the closing verification for that facet
- NIT | code-summary.md FR-4 | provenance mix noted: builder-transcribed evidence vs conductor re-measured 8/8 fanout run
