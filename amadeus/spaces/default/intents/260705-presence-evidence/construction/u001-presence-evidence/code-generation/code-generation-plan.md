# Code Generation Plan — u001-presence-evidence（260705-presence-evidence）

上流入力: [business-logic-model.md](../functional-design/business-logic-model.md)、[reliability-design.md](../nfr-design/reliability-design.md)、[security-design.md](../nfr-design/security-design.md)

## チェックリスト

- [x] 1. FR-2.3 再読了記録: `verifyDocsOnlyEvidence`（`.agents/amadeus/tools/amadeus-state.ts` 549–588）、`GUARD_EXEMPTED` emit（同 905–949）、`humanActedSinceGate`（`.agents/amadeus/tools/amadeus-lib.ts` 1450–1498）を再読了し、mockups.md の骨子との一致を確認した（`boundary-section-draft.md` の再読了記録節）。
- [x] 2. `boundary-section-draft.md` を執筆した（audit-format.md 末尾説明節群への追加 H2 節、Title Case 確定、英語）。
- [x] 3. `parity-reason-supplement-draft.md` を執筆した（parity-map.json #499 エントリ reason への追補一文、日本語、独立文）。
- [x] （#542 merge の解禁通知 01:49:20Z を受けて実施）4. `.agents/amadeus/knowledge/amadeus-shared/audit-format.md` へ `boundary-section-draft.md` の英語本文をそのまま追加する（末尾の説明節群、Format Standards 等の並び）。冒頭の `Event Registry (N events, M categories)` カウントは更新しない（本節はカウント外。#428 merge 後は `71 events` 表記になる見込みだが影響なし）。
- [x] （同上。#542 後の実形どおり既存 reason 末尾へ独立一文を追補、diff は 1 行）5. `dev-scripts/data/parity-map.json` の該当 exceptions エントリの `reason` 末尾へ `parity-reason-supplement-draft.md` の一文を追補する。post-#428 のエントリ形状（target 一覧、events カウント表記）に合わせて語順を調整してよいが、内容（Issue 番号・判断内容・分離）は変えない。
- [x] （実行済み。結果は code-summary の検証記録を参照）6. 検証: 対象 Intent 指定の validator、`npm run test:all`、`npm run parity:check` を実行し、結果を record（`test-results.md` 等）へ記録する。
- [ ] **[PENDING engineer1 followup PR merge（#539 は merge 済みだが偽 GREEN 修正の followup を待つ。decision 2026-07-06T01:42 頃参照）]** 7. PR 作成: 対応 Issue #506 と本 Intent（260705-presence-evidence）をリンクし、変更範囲（audit-format.md への H2 節追加、parity-map.json の reason 追補のみ。エンジンコード変更なし）と検証結果を記載する。

## 備考

- 手順 1〜3 は本ステージ内で完了済み（record 成果物のみ）。
- 手順 4〜7 は BR-7（#428 との書き込み競合回避）により、#428 merge 後まで実行を保留する。
