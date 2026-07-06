# Business Logic Model — u001-presence-evidence（260705-presence-evidence）

上流入力: [requirements.md](../../../inception/requirements-analysis/requirements.md)、[mockups.md](../../../inception/refined-mockups/mockups.md)、[decisions.md](../../../inception/application-design/decisions.md)、[bolt-plan.md](../../../inception/delivery-planning/bolt-plan.md)

## 追認（application-design の前倒し確定）

AD-1〜AD-3 を追認する。本ステージは再確定せず、執筆計画だけを確定する。

## 執筆計画（B001-boundary-doc）

1. **着手順（engineer1 の訂正 00:32:15Z で再確定）**: #428 は parity-map / baseline に加えて **audit-format.md 本体も統合中**（RECOMPOSED 追記 + Event Registry 70→71、skills 正準ソース同期）。先行できるのは **record 成果物（設計境界節の下書きと stage 成果物）だけ**であり、audit-format.md 本体への反映（手順 2）・parity-map reason 追補（手順 3）・最終検証・PR 作成はすべて **#428 merge 後**に、merge 後の実形（71 events、RECOMPOSED 行あり）へ合わせて実施する。
2. **audit-format.md（#428 merge 後）**: 末尾の説明節群（Format Standards 等）の並びに、独立 H2 節 `## Evidence Verification Boundary (docs-only declaration)` を追加（Title Case を正とする。mockups.md の骨子見出しは小文字始まりの仮置きだったが、audit-format.md の既存 H2 = Title Case 慣行に合わせて本ステージで確定）。内容は mockups.md の骨子（5 要素 + 出典）を、執筆時に verifyDocsOnlyEvidence を再読了した上で確定（FR-2.3）。冒頭カウントは更新しない（AD-2。merge 後は 71 events 表記になる見込みだが、本節はカウント外のため影響なし）。下書きは record 成果物（code-generation の boundary-section-draft.md）として先行執筆する。
3. **parity-map.json**: 既存 exceptions エントリ（#499 由来）の reason 末尾へ独立の一文を追補: 「Issue #506: audit-format.md に Evidence Verification Boundary 節を追加（presence 相関の不採用と防衛線の明文化。人間承認 DECISION_RECORDED requirements-analysis 2026-07-06）。」他 3 ファイル（tools）の説明とは文で区切り、混同を避ける。
4. **検証**: validator（Intent 指定）+ npm run test:all + parity:check の pass を記録。
