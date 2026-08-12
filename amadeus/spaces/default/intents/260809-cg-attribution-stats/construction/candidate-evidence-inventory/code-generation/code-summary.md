# Code Summary — candidate-evidence-inventory

## 実装結果

- Source: `packages/framework/core/tools/amadeus-stage-attribution-candidates.ts`（836行）
- Test: `tests/unit/t486-stage-attribution-candidates.test.ts`（527行）
- Commit: `4bd140b8fe3f8c98dd695f4a51a89936eb98cc09` (`feat(stage-stats): add candidate evidence inventory`)
- Review fix: `3f5b5091221f3c17743969ee6ce73bb87ca2f673` (`fix(stage-stats): fail closed on missing event digests`)
- Batch 2 referee: `converged=true`、`tampered=false`

attribution-only corpus projection、canonical wire dedup、9 family closed classifier、family-specific Event Set decode、全outer collision index、explicit intent/stage/identity grouping、fixed rejection precedence、primary/secondary診断、family accountingをpure moduleとして実装した。legacy measured branch、interval accounting、report、renderer、filesystem/processには依存しない。

## 検証

- Focused test: 12 pass / 0 fail / 53 assertions
- Repository typecheck: pass
- Repository lint: exit 0（既存454 warningsのみ、所有2ファイルはdiagnostic 0）
- Parent integration後の共通focused/typecheck/lintはCode Generation統合検証で再実行する。

## 実装判断とfail-closed境界

現行execution、unit-pool、loop-monitor Event Setには共通schema discriminatorがないため、family-specificなexact wire shapeをsupported schemaとして検査する。一方、digestは例外なく必須とし、executionはembedded/outer digest、unit-pool/loop-monitorはouter digestをcanonical bytesから再計算する。欠落は`malformed-event-set`、不一致は`digest-mismatch`としてinnerを採用せずouter 1件をrejectする。transactionはschema/identity/inner/digestを検証できるIntent Autonomyだけを展開し、transaction-level digestがないQuality Repair/Intent Completionはouter 1件としてfail-closedにする。存在しないevidenceを推定せず、FR-EVT-2を縮小しない。

## Scope保持

U-02 は candidate inventory の supporting slice だけを完了した。Issue #2695 の FR 25件、NFR 7件、完了条件1〜10は U-03、U-04、Build and Testを含む全体mappingに保持され、stage全体またはIntent全体の完了を意味しない。
