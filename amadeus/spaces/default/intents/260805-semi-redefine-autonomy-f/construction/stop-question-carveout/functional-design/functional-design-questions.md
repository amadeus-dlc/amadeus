# Functional Design 質問記録 — `stop-question-carveout`(#2253)

上流入力(consumes 全数): unit-of-work.md, unit-of-work-story-map.md, requirements.md, components.md, component-methods.md, services.md

- **様式**: **0 問様式**(既習形)。`[Answer]` タグを持つ質問行は 0 件である。
- **E-OC1 判定**: **選挙不要**。根拠種別は「既決規範の機械的執行」— 本 Unit の全設計分岐が承認済み上流(`component-methods.md` §C11 の述語契約表・呼び出し点割当表、`requirements.md` FR-STOP-1/2 / FR-PIN-2、ADR-7)から一意に導出できる。上流が FD へ委譲した唯一の空欄(U-5 / OQ-3 = 述語の最終命名)は、既存の流儀(`cid:requirements-analysis:c5` — 命名はユーザーに問わず既存パターンに合わせる)と同期対象最小化から一意に定まる(D2)。
- ユーザー承認: 2026-08-05T04:52:54Z(Intent autonomy `full` の設定トランザクション — 監査シャード `INTENT_AUTONOMY_TRANSACTION_COMMITTED`(projection.mode=full、events=afterMode|grant)の timestamp からの転記。本 Unit 固有の追加裁定事項は 0 件)

---

## 機械導出の記録(設計分岐と一次根拠)

| # | 設計分岐 | 導出した答え | 一次根拠 |
| --- | --- | --- | --- |
| D1 | 述語 2 本の契約と呼び出し点割当 | `component-methods.md` §C11 の 2 表を逐語採用(full 限定 = 現行 `isFullyAutonomousIntent` と完全同値 / carve-out = semi は `mode === "semi" ∧ modeProvenance.kind === "human-command"`、full は full 限定と同じ、他は false。`:422` = carve-out、`:457` / `:716` = full 限定) | 承認済み application-design(FR-STOP-1 の表と 1:1) |
| D2 | 述語の最終命名(U-5 / OQ-3) | **full 限定述語は既存名 `isFullyAutonomousIntent` を保存**(意味論が完全同値のため改名理由が無い)。carve-out 述語は新設 `isQuestionCarveoutIntent(stateContent, resolvedProjectDir?)`(既存 `isFullyAutonomousIntent` / `isPendingQuestionStop` の is-接頭・Intent 末尾の流儀に一致)。**帰結**: 同期対象 2 点(`tests/.coverage-patch-allowlist.json:5268` の verbatim `      "function": "isFullyAutonomousIntent",` — 属するエントリは `:5265-5275`、`tests/unit/t147-kiro-hook-adapter.test.ts:723` のコメント verbatim `    // long ceiling AUTONOMOUS_BLOCK_CAP=8. Same brownfield-feature engine state`)は**改名同期が不要**になり、allowlist は行シフトの機械 remap(U-6)のみが残る — 同期作業の最小形 | `cid:requirements-analysis:c5`(既存の流儀に合わせる)+ 同期対象の実測(worktree HEAD `5f6561eef6098209c4c29461ae0d7c6d070b5c01` で再実測 — §12a iteration 1 是正時に旧 ref `6191bbfc…` の範囲引用を実測 verbatim へ差し替え) |
| D3 | 例外時の扱い | 両述語とも `catch → false`(現行 `:175-177` と同じ)。この文脈の `false` は「carve-out を与えない = 保守側」であり fail-closed と整合(C13 の意図的相違とは逆向きで正しい — 引用の意味論適合) | §C11 の例外時列 / `cid:application-design:citation-semantics-check` |
| D4 | FR-PIN-2 の t121 反転設計 | `tests/integration/t121-stop-hook-enforce.test.ts:1138-1150`(verbatim `test("(f) semi + blank question ALLOWS because questions remain human-owned", ...)`)を反転 — semi + pending 質問は carve-out により stop を **BLOCK**(走行継続)する期待へ書き換え、テスト名も新意味論(質問は無人解決へ)を述べる名へ改訂。反転は本 Unit の C11 変更と同一 PR(同一変更でしか green を保てない — `unit-of-work.md` §テスト・ピンの所属) | FR-PIN-2 / FR-STOP-1 (1) |
| D5 | FR-STOP-2 の不変確認 | `AUTONOMOUS_BLOCK_CAP`(`:153`)と `stopBudgetMode`(`:157-160`)は diff に現れない(検証: 実装 PR の diff 照合 + 既存 cap / budget テスト無改変 green — `tests/unit/t147-kiro-hook-adapter.test.ts:721` の cap テスト verbatim `  test("13: FULL KEEPS CAP 8 - Kiro stop still blocks on call 3 under full Intent autonomy (the long ceiling, not the interactive 2)", () => {` を含む。worktree HEAD `5f6561eef6098209c4c29461ae0d7c6d070b5c01` 実測) | FR-STOP-2 |
| D6 | テスト層と seam | t456(予約済み)。`isPendingQuestionStop` は export 済み(`:420` 実測 verbatim `export function isPendingQuestionStop(...)`)、新述語も export して in-process 駆動。projection 実 FS を使うケースは integration 層(t121 は既存 integration) | `unit-of-work.md` §テスト番号の予約 / `cid:code-generation:fs-tests-integration-first` |

---

## 完全性確認

- 空の `[Answer]` タグ: **なし**(0 問様式)
- 未解決の設計判断: **なし**(D1〜D6 一意導出。U-5 は D2 で確定 — 改名なしのため同期は U-6 の行 remap のみ)
- 後続へ委ねる判断: U-6(allowlist 行ピン remap — 自 PR 実装時)
- 上流との矛盾: **なし**(D1 は §C11 の逐語採用。D2 の既存名保存は ADR-7「分割する」と両立 — 分割 = 述語 2 本化であり、full 限定側の意味論・名前は不変)
