# Code Summary — run-tests-totals-seam

## 変更ファイル

- `tests/run-tests.ts`: SUMMARY と同じ4カウンタを `coverage/tests-totals.json` に best-effort で出力する seam を追加した。
- `tests/lib/run-tests-totals.ts`: in-processで検証可能なpure mappingとwriterを分離した。
- `tests/unit/t220-run-tests-totals.test.ts`: 4キー、写像、coverage非依存、失敗隔離、SUMMARY不変を検証した。
- `tests/integration/t220-run-tests-totals.integration.test.ts`: 非coverage実行でJSONとSUMMARYが一致することを検証した。

## 判断

- 出力先は既存 `coverageRoot` を再利用し、ディレクトリ作成と書込失敗をwriter内に閉じ込めた。
- runnerの終了コード計算は変更していない。

## テスト結果

- unit: 3件 pass。
- integration: 3件 pass。
- typecheck: pass。

## 計画逸脱

- rebase後に導入済みだったunit×Small ratchetとの交差により、計画でunitに置いていた実FS writer・runner source読込を既存integrationへ移した。`tests/unit/t220-run-tests-totals.test.ts` にはpureな4カウンタ写像契約を残し、高速unit価値を維持した。allowlist追加は行っていない。
- `tests/run-tests.ts` の新しい静的importに追随し、既存 `t112.serial` scratch fixtureへ実 `run-tests-totals.ts` のコピーを追加した。runner本体の終了コード契約は変更していない。

## Review — Iteration 2（rebase後・裁定A反映）

**Verdict:** READY
**Reviewer:** amadeus-architecture-reviewer-agent
**Date:** 2026-07-12

### Findings

- Blocking findingなし。4カウンタのpure写像をSmall unitに残し、実FS・runner process・source読込境界をintegrationへ移した構成は裁定Aと一致する。
- `tests/run-tests.ts` の静的import graphに対し、`tests/integration/t112.serial.test.ts` のscratch fixtureが実 `tests/lib/run-tests-totals.ts` をコピーするため、隔離runnerのload契約が復元されている。

### 検証結果

- focused（t220、t112を含む全対象）: 44 pass / 0 fail。
- size purity (`tests/unit/t-test-size-drift.test.ts`): 16 pass / 0 fail。allowlist差分なし。
- `git diff --check`: pass。正準full CIはconductor実測exit 0を確認済み。

### 残存リスク

- writer失敗は要件どおりbest-effortでrunnerを失敗させないため、stderrの通知を運用で見落とす可能性は残る。既存契約内の受容済みリスクである。
