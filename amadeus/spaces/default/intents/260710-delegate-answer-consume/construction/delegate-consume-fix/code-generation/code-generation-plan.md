# Code Generation Plan — delegate-consume-fix(#736)

> 上流: `../../../inception/requirements-analysis/requirements.md`(FR-1 の2述語定義+per-delegate 枠が設計仕様。bugfix scope により functional-design はスキップ)。
> 実装先: Bolt worktree(base: origin/main)ブランチ `bolt/delegate-answer-consume`。正本は `packages/framework/core/tools/`。

## Steps

- [ ] Step 1: `packages/framework/core/tools/amadeus-lib.ts` の境界ロジック再設計(FR-1)
  - **gate 述語**(`humanActedSinceGate(pd, verb)` の verb 指定時): 真 ⇔ (i) 検証済み verb 一致 delegation で「それより後(ledger 順)に GATE_APPROVED/GATE_REJECTED が無い」ものが存在(gate 枠未消費)、または (ii) HUMAN_TURN で「後にいかなる resolution(GATE_*/QA)も無い」ものが存在(ローカル意味論不変)
  - **answer 述語**(`humanActedSinceLastAnswer`): 真 ⇔ (i) 検証済み delegation(両 type — 現行 verb 無しの受理範囲を維持)で「後に QUESTION_ANSWERED が無い」ものが存在(answer 枠未消費)、または (ii) HUMAN_TURN で「後にいかなる resolution も無い」ものが存在 — thin alias を廃し専用ロジック化
  - **verb 無し `humanActedSinceGate(pd)`**(発行側 grounding :1625/:1719 の呼び出し形): 現行挙動を変更しない(Q3=A)
  - 枠状態は ledger スキャンで導出(新規オンディスク状態なし — requirements の推奨に従う)。verifyDelegatedProvenance(偽造拒否)は不変
  → FR-1/FR-2/FR-4
- [ ] Step 2: 交差回帰テスト新設 `tests/unit/t-delegate-answer-consume.test.ts`(`// size: small` 相当の in-process、t112 の scaffold 流用)
  - (a) delegate → QA → gate 述語(approve)= true(主要件)
  - (b) 落ちる実証: (a) を修正前コードで実行して false になることを実証(コミット前に旧コードで実測、証跡を summary へ)
  - (c) 4分岐: QA 1回目 = answer 述語 true → QA 後2回目 = false / GATE 1回目 = true → GATE_APPROVED 後2回目 = false
  - (d) DELEGATED_REJECTION → QA → gate 述語(reject)= true
  - 非退行: ローカル HUMAN_TURN → QA → gate 述語 = false(t188 意味論)/ 偽造 delegation は両述語 false(t112 意味論)/ verb 混合(APPROVAL×reject)= false(#685)
  → FR-2/FR-3
- [ ] Step 3: 既存スイート非退行 — t112 / t188 / t28(audit-event-sync)グリーン維持を実測
- [ ] Step 4: dist 同期 — `bun scripts/package.ts` 再生成+`bun run promote:self` を同一コミットに含める(NFR-1)
- [ ] Step 5: 検証一式(exit code 記録): typecheck / lint / dist:check / promote:self:check / `bash tests/run-tests.sh --ci`

## 非対象

- 発行側 grounding(:1625/:1719)の変更(Q3=A)/ audit イベントスキーマ変更 / delegate 失効機構 / 旧挙動温存フラグ(Forbidden)
