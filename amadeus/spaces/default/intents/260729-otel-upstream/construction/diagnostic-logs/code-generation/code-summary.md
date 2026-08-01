# Code Summary — U10: diagnostic-logs

上流入力: unit の functional-design（business-logic-model.md / business-rules.md / domain-entities.md）／nfr-requirements／nfr-design 成果物（全数参照済み）、上流 components.md / component-methods.md / services.md。

## Files created

- `tests/integration/t368-diagnostic-logs.test.ts`（302行）: routing（BR-1 audit journal 非混入・audit exporter 未呼出）、相関（BR-3 active span の traceId/spanId・BR-9 Context なしでも保存）、同期観測性（BR-8）、fail-open（例外非伝播・latch 未 set・mutation 継続可・drop note 1 回・二次 emit ゼロ・note の scrub 済み値のみ）、append 回数 1 と timer 不在、BR-6 corpus sweep、U5 carrier 経由の process 横断相関
- `tests/unit/t368-diagnostic-name-guard.test.ts`（65行）: `findDiagnosticNameMisuse` の負例（canonical OTel 名・v1 audit event 型の両方を報告／自由形式名は報告しない／空語彙は fail closed／既定語彙が registry 由来であること）
- `tests/helpers/otel-diagnostic-child.ts`（34行）: W3C carrier を remote parent として adopt し span 内で `emitDiagnostic` する子 process

## Files modified

- `packages/framework/core/otel/local-log-exporter.ts` — drop note の `warn` port（`DropNote`）を追加。既定は stderr、テストは注入で観測。`describeDrop` は credential scrubber を通した record name と失敗理由のみを出力し attrs は載せない（失敗経路を二層 redaction の例外にしない、security-design）。二次 emit は行わない（BR-10）
- `packages/framework/core/otel/event-registry-drift.ts` — `findDiagnosticNameMisuse`（BR-6 の静的 guard）と registry 由来の canonical 名語彙導出（各 canonical def の OTel 名 + v1 audit event 型）を追加。空語彙は vacuous に通さず fail closed
- 生成物 — 7 harness dist + 5 self-install 面（上記 2 正本ファイルの投影のみ）

## Key implementation decisions

- BR-6 は runtime throw ではなく静的 guard として実装した。diagnostic 経路は契約上 fail-open（BR-2）で呼出し側へ例外を出せないため、分類境界の誤用は検査で拒否する
- 語彙を registry table から導出したため、新しい canonical event は着地と同時に diagnostic から使用不可になる（手動同期の余地を残さない）
- 実装デルタは上記 2 点のみ。U1/U4 が既に主経路（Context からの ID 採取・同期 append・export 境界 redaction・canonical 非 dispatch）を敷いていたため、残る BR は characterization テストとして固定した（TDD slice には数えない）

## Test coverage summary

- TDD slice 3 件（各 slice で Red 実測 → 最小実装 → Green → コミット）: `bfdf48eef` warn port（Red: notes.length 0）／`e5e81aa26` BR-6 guard（Red: export 不在）／`bbee25fd3` vacuity check の到達可能化（Red: throw されず `[]`）
- 落ちる実証: corpus sweep へ違反 call site を注入して赤を実測 → revert して緑を再確認（注入と revert は不可分の 1 セット、head に残さない）
- 検証 exit code: typecheck 0 / lint 0 / dist:check 0 / promote:self:check 0 / `gen-coverage-registry.ts --check` 0 / t368 + 影響既存 otel スイート（13 files・124 tests）0
- 新規行の被覆: lcov 実測で未被覆 0 行
- PR #1731: MERGEABLE、チェック 18 pass / 2 skipping、レビューコメント 0 件（マージは人間承認待ち）

## Deviations from the plan

- 実装前停止に至った逸脱はなし。
- **Note（conductor 執行裁定 2026-07-30）**: performance-requirements の「1 回の同期 append のみ」と U4 `defaultWrite`（`mkdirSync` + `appendFileSync` の 2 FS 操作）の齟齬について、**U4 実装を正とし要件表現を明確化**する裁定を受領。要件の趣旨は「record あたりの append 書込が 1 回・同期・バッファ／タイマー／リトライ経路なし」であり、冪等な ensure-dir セットアップ FS 操作は append に数えない。BR-11 遵守のまま U4 コードは無改変で、明確化は `nfr-requirements/performance-requirements.md` に申告付きで追記した。検証は注入 seam 経由の append 回数 1 + timer 不在の静的検査で固定
- **Note（別 Issue へ回付）**: `promote-self.ts --apply` が `.codex/tools/data/scope-grid.json` に差分を出す件は、conductor 再実測で削除ではなく**内容同一のキー順入替**と確定（`jq -S` 正規化比較で IDENTICAL）。Issue #1734 として起票済み（P3/S4）。本 Bolt では当該ファイルを restore して PR から除外した
- **Note**: worktree 内の `amadeus-state.md` / audit シャードの hook 由来差分は engine/state 操作禁止に従い無改変・未コミットで残置（conductor が本線で扱う）
