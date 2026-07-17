# Component Dependency — standing-delegation-grant

上流入力(consumes 全数): `../requirements-analysis/requirements.md`(FR-1〜8・E-SDG-RA/RA2 裁定焼き込み)、`../../ideation/feasibility/constraint-register.md`(C-1〜C-10)、codekb `code-structure.md`(delegate provenance 観測節)・`architecture.md`・`component-inventory.md`(いずれも本日 RE 現況)、`../practices-discovery/team-practices.md`(変更 0 件 — practices 制約なしの確認)

## 依存グラフ

C-5(taxonomy/保護イベント)→ C-1(verb が emit)→ C-2(受理検証が行を消費)→ C-4(doctor が findActiveStandingGrant を再利用)。C-6(テスト)は全コンポーネントに依存(最後)。

実装順序: C-5 → C-1 → C-2(+C-3 内包)→ C-4 → C-6。単一 unit・直列(交差なし)。

- Integration points: assertHumanPresentForGateResolution(:1781、approve verb のみ)/ handleDelegateApproval(:1975 — targetRecord 解決の前置移動込み)の2箇所。handleDelegateRejection(:2069)は**意図的に対象外**(ADR-7 決定2 — symmetric-pair-review 検討済みの授権範囲反映)。既存テストの白側 sweep が退行検知
- Parallel opportunities: なし(直列が自然な規模)

## 交差判定

単一 unit・単一 Bolt につき Bolt 間交差なし。並行する他 intent(metrics-retention-gc / teamup-msg-backend)との正本交差は amadeus-state.ts / amadeus-lib.ts の編集面で潜在 — code-generation 着手前に c6 の実 diff 判定を行う(bolt-plan で明記予定)。
