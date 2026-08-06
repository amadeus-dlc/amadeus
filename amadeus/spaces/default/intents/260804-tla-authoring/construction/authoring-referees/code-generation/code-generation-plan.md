# Code Generation Plan — U3 authoring-referees(Bolt 3、バッチ 2)

上流入力(consumes 全数): U3 の functional-design(business-logic-model.md / business-rules.md / domain-entities.md)と nfr-design(security-design.md / logical-components.md)、`bolt-plan.md` Bolt 3 節、`requirements.md` FR-006 / FR-007 / FR-008。

## 実装ステップ(TDD vertical slice — 受け入れ基準の述語を逐語で写す)

1. C3 trace coverage referee: `InvariantNameCodec.parse`(TLA+ 識別子文法)+ `TraceCoverage.evaluate` — 4欠陥クラス(uncoveredSubjects / orphanInvariants / duplicateSubjects / unresolvedRows)を独立収集して同時返却、1件でもあれば CoverageProof 不生成(BR-U3-06〜11 = 3欠陥全数列挙 + α)— 失敗テスト先行(t446)
2. C5 proof obligations referee: `ProofObligations.evaluate` — 5条件を独立評価し `ProofFailure.missing` へ全数列挙、falling/vacuity は invariant ごと逐次(ND 直列規定)。toolchain は port 注入({versionLine, run})、既存 TLC toolchain 無変更(ADR-5 / BR-U3-03 = TLC 再実装ゼロ)— t446
3. handler 層: `MutationWorkshopFs`(OS temp の run dir へ変異系生成 → 計測 → finally 破棄 = BR-U3-05 の注入→実測→破棄1セット)、reduction manifest 読取
4. CLI: `trace --subjects --rows --invariants` / `proof --model --cfg --reduction --invariants --identity`(FD §3 argv 契約逐語、typed verdict JSON、exit 0/1/2)— t447
5. production adapter(裁定 A): `tla-referee-toolchain.ts` — referee port を既存 planned TLC 経路(createDefaultModelCheckToolchain → acquire → preparePlanned → runPlanned)へ結線、既存 executor 経路(run-model-check-source.ts のバイト同一性検査)は不変
6. 実 TLC 実測: 既存 probe 様式の standalone probe(tests/formal-verif/support/)で jar 取得 + 実 JDK + 実行を実測
7. 検証: typecheck / lint / t446+t447+t439 / full CI を worktree solo で完走

## 品質規約

functional domain modeling(判別ユニオン Result、typed ProofFailure、fail-closed)。TLC 側の child process 契約は import 消費のみで無改変。
